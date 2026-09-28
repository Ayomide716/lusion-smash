import * as THREE from "three/webgpu";
import {
  Fn,
  texture,
  uvec2,
  textureLoad,
  vec2,
  If,
  float,
  hash,
  instanceIndex,
  instancedArray,
  mix,
  mx_noise_vec3,
  select,
  smoothstep,
  storage,
  time,
  uniform,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import { buildShapes, sculptureFor, SHAPES, textShape, type ShapeName } from "./shapes";
import { sceneState, setStats } from "@/lib/scene-store";
import { FIELD_SIZE, STATE, type Engine } from "@/lib/engine";
import { peers } from "@/lib/presence";

export type SimulationOptions = {
  count: number;
  size: number;
  reducedMotion: boolean;
  text: string;
};

export type FrameInput = {
  delta: number;
  elapsed: number;
  width: number;
  height: number;
  fov: number;
};

// GPU particle simulation: storage buffers, the TSL compute kernel and the
// sprite material. Kept outside React so uniforms can be mutated every frame.

const SPIN: Record<ShapeName, number> = { initials: 0, sphere: 0.14, knot: 0.1, galaxy: 0.06 };
const CAMERA_Z = 6;
const wordCache = new Map<string, Float32Array>();
/** Spelled when the visitor has done nothing for IDLE_AFTER ms. */
const IDLE_WORD = "STILL THERE? 👀";
const IDLE_AFTER = 10_000;

type Section = { shape: number; x: number; y: number; scale: number };

// Section positions in document coordinates. Measuring them (getBoundingClientRect)
// every frame forced a layout mid-frame, the main cause of scroll stutter; now
// they're measured at most once a second, or when the page or its size changes.
type Measured = Section & { docTop: number; el: HTMLElement };
let measured: Measured[] = [];
let measuredAt = -Infinity;
let measuredHeight = 0;
if (typeof window !== "undefined") {
  window.addEventListener("resize", () => (measuredAt = -Infinity), { passive: true });
}

function measureSections() {
  const now = performance.now();
  const height = document.documentElement.scrollHeight;
  const stale =
    now - measuredAt > 1000 || height !== measuredHeight || (measured.length > 0 && !measured[0].el.isConnected);
  if (!stale) return measured;
  measuredAt = now;
  measuredHeight = height;
  const scrollY = window.scrollY;
  measured = Array.from(document.querySelectorAll<HTMLElement>("[data-shape]"), (el) => ({
    el,
    docTop: el.getBoundingClientRect().top + scrollY,
    shape: Math.max(0, SHAPES.indexOf(el.dataset.shape as ShapeName)),
    x: Number(el.dataset.shapeX ?? 0),
    y: Number(el.dataset.shapeY ?? 0),
    scale: Number(el.dataset.shapeScale ?? 1),
  }));
  return measured;
}

/** Work out which two section shapes to blend between at the current scroll position. */
function readScrollTargets(viewportH: number) {
  const nodes = measureSections();
  if (nodes.length === 0) return null;
  const anchor = viewportH * 0.6;
  const scrollY = window.scrollY;
  let current = 0;
  const sections: (Section & { top: number })[] = [];
  nodes.forEach((n, i) => {
    const top = n.docTop - scrollY;
    sections.push({ shape: n.shape, x: n.x, y: n.y, scale: n.scale, top });
    if (top <= anchor) current = i;
  });
  const from = sections[current];
  const to = sections[Math.min(current + 1, sections.length - 1)];
  const start = viewportH * 1.1;
  const t = to === from ? 0 : THREE.MathUtils.clamp((start - to.top) / (start - anchor), 0, 1);
  return { from, to, t: t * t * (3 - 2 * t) };
}

export function createSimulation({ count, size, reducedMotion, text }: SimulationOptions) {
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-space-grotesk").trim();
  const font = display || getComputedStyle(document.body).fontFamily || "sans-serif";
  const shapes = buildShapes(count, text, font);


  // Start as a wide cloud so the first frames read as the particles gathering.
  const start = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    if (reducedMotion) {
      start.set(shapes.initials.subarray(i * 4, i * 4 + 4), i * 4);
      continue;
    }
    // A wide, shallow disc behind the shape (never between it and the camera).
    const r = 1.5 + Math.random() * 3.5;
    const th = Math.random() * Math.PI * 2;
    start[i * 4] = r * Math.cos(th) * 1.6;
    start[i * 4 + 1] = r * Math.sin(th);
    start[i * 4 + 2] = -1.5 - Math.random() * 2.5;
  }

  const positions = storage(new THREE.StorageInstancedBufferAttribute(start, 4), "vec4", count);
  const velocities = instancedArray(count, "vec4");
  // Shape targets live in float textures fetched by particle index. This is the
  // one layout that works on both backends: the WebGL 2 fallback emulates
  // compute with transform feedback, which only binds storage buffers (and
  // turns every one of them into an output, max 4).
  const texWidth = 512;
  const texHeight = Math.ceil(count / texWidth);
  const texel = uvec2(instanceIndex.mod(texWidth), instanceIndex.div(texWidth));
  const targets = SHAPES.map((name) => {
    const data = new Float32Array(texWidth * texHeight * 4);
    data.set(shapes[name]);
    const tex = new THREE.DataTexture(data, texWidth, texHeight, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    return tex;
  });
  const targetNodes = targets.map((tex) => textureLoad(tex, texel) as unknown as THREE.Node<"vec4">);

  const makeTex = (source?: Float32Array) => {
    const data = new Float32Array(texWidth * texHeight * 4);
    if (source) data.set(source);
    const tex = new THREE.DataTexture(data, texWidth, texHeight, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    return tex;
  };
  // Hover words ("WORK", a project name…) are rasterised on demand into this texture.
  const wordTex = makeTex();
  const wordNode = textureLoad(wordTex, texel) as unknown as THREE.Node<"vec4">;

  // Velocity field from the WebAssembly fluid solver (RG half floats, uv/s),
  // uploaded each frame straight from a view over wasm memory. Starts empty
  // and stays harmlessly zero if the engine can't load.
  // Allocated at the solver's size up front: three.js updates existing textures
  // in place, so growing it later would overflow the GPU allocation.
  const fieldTex = new THREE.DataTexture(
    new Uint16Array(FIELD_SIZE * FIELD_SIZE * 2),
    FIELD_SIZE,
    FIELD_SIZE,
    THREE.RGFormat,
    THREE.HalfFloatType,
  );
  fieldTex.magFilter = THREE.LinearFilter;
  fieldTex.minFilter = THREE.LinearFilter;
  fieldTex.needsUpdate = true;

  const u = {
    dt: uniform(0),
    from: uniform(0, "int"),
    to: uniform(0, "int"),
    blend: uniform(0),
    rotFrom: uniform(0),
    rotTo: uniform(0),
    scale: uniform(1),
    offset: uniform(new THREE.Vector3()),
    spring: uniform(reducedMotion ? 5 : 3.2),
    turbulence: uniform(reducedMotion ? 0.35 : 0.9),
    damping: uniform(0.92),
    pointer: uniform(new THREE.Vector3(99, 99, 0)),
    pointerVel: uniform(new THREE.Vector2()),
    pointerRadius: uniform(0.55),
    pointerStrength: uniform(reducedMotion ? 0.6 : 1),
    energy: uniform(0),
    size: uniform(size),
    /** World units spanned by the viewport at z = 0 (maps world xy ↔ fluid uv). */
    fieldScale: uniform(new THREE.Vector2(1, 1)),
    fluidDrag: uniform(reducedMotion ? 2 : 4.5),
    opacity: uniform(0.85),
    shockPos: uniform(new THREE.Vector2(0, 0)),
    shockAge: uniform(99),
    /** 1 for a click; up to 3 for the burst after a charged hold. */
    shockPower: uniform(1),
    /** Hold-to-charge level (0..1) and where the finger or cursor is. */
    charge: uniform(0),
    chargePos: uniform(new THREE.Vector2()),
    /** Smoothed scroll speed in world units per second (+ = scrolling down). */
    streak: uniform(0),
    hover: uniform(0),
    wordScale: uniform(1),
    wordOffset: uniform(new THREE.Vector3()),
    tilt: uniform(new THREE.Vector2()),
    /** Mood service tint (linear RGB) and how far the palette leans into it. */
    moodTint: uniform(new THREE.Color(0.838, 0.064, 0.319)),
    moodMix: uniform(0),
  };

  const pick = (idx: typeof u.from) => {
    const t = targetNodes.map((target) => target.xyz);
    return select(idx.equal(0), t[0], select(idx.equal(1), t[1], select(idx.equal(2), t[2], t[3])));
  };

  const rotateY = Fn(([v, a]: [THREE.Node<"vec3">, THREE.Node<"float">]) => {
    const c = a.cos();
    const s = a.sin();
    return vec3(v.x.mul(c).add(v.z.mul(s)), v.y, v.z.mul(c).sub(v.x.mul(s)));
  });

  // Curl of a vector noise field (forward differences) — divergence-free,
  // so particles swirl like a fluid instead of clumping.
  const curlNoise = Fn(([q]: [THREE.Node<"vec3">]) => {
    const e = 0.12;
    const n0 = mx_noise_vec3(q);
    const nx = mx_noise_vec3(q.add(vec3(e, 0, 0)));
    const ny = mx_noise_vec3(q.add(vec3(0, e, 0)));
    const nz = mx_noise_vec3(q.add(vec3(0, 0, e)));
    return vec3(
      ny.z.sub(n0.z).sub(nz.y.sub(n0.y)),
      nz.x.sub(n0.x).sub(nx.z.sub(n0.z)),
      nx.y.sub(n0.y).sub(ny.x.sub(n0.x)),
    ).div(e);
  });

  const update = Fn(() => {
    const pos = positions.element(instanceIndex);
    const vel = velocities.element(instanceIndex);
    const seed = hash(instanceIndex);
    const dust = hash(instanceIndex.add(7919)).lessThan(0.08);

    // Stagger the morph per particle so shapes dissolve rather than snap.
    const b = smoothstep(0, 1, u.blend.mul(1.6).sub(seed.mul(0.6)));
    const a = rotateY(pick(u.from), u.rotFrom);
    const c = rotateY(pick(u.to), u.rotTo);
    const scrolled = mix(a, c, b).mul(u.scale).add(u.offset);
    // Hovered word, staggered per particle like the scroll morph.
    const hb = smoothstep(0, 1, u.hover.mul(1.6).sub(seed.mul(0.6)));
    const target = mix(scrolled, wordNode.xyz.mul(u.wordScale).add(u.wordOffset), hb);

    const p = pos.xyz;
    // While charging, the springs let go so the shape can be drawn in.
    const spring = select(dust, float(0.04), u.spring.mul(seed.mul(0.8).add(0.6))).mul(u.charge.mul(-0.85).add(1));
    const acc = target.sub(p).mul(spring).toVar();

    const flow = curlNoise(p.mul(0.55).add(vec3(0, time.mul(0.07), time.mul(0.11))));
    const churn = select(dust, float(0.6), u.energy.mul(1.5).add(0.35));
    acc.addAssign(flow.mul(u.turbulence).mul(churn));
    // Fast scrolling drags the field along with the page (warp speed); the
    // springs snap it back once scrolling stops.
    acc.y.addAssign(u.streak.mul(seed.mul(0.5).add(0.15)));
    // Phone tilt sloshes the field sideways; the springs pull it back.
    acc.xy.addAssign(u.tilt);

    // Fluid: particles are dragged towards the local flow of the Navier–Stokes
    // field, but only where it's moving, so still air doesn't damp them.
    const fieldUV = p.xy.div(u.fieldScale).add(0.5);
    const inside = fieldUV.greaterThanEqual(vec2(0)).all().and(fieldUV.lessThanEqual(vec2(1)).all());
    const flowUV = texture(fieldTex, fieldUV, 0).xy;
    const flowWorld = select(inside, flowUV.mul(u.fieldScale), vec2(0));
    const moving = flowWorld.length().mul(1.5).saturate();
    acc.xy.addAssign(flowWorld.sub(vel.xy).mul(u.fluidDrag).mul(moving));

    // Pointer: push outward, swirl around the cursor and drag along its velocity.
    const d = p.xy.sub(u.pointer.xy);
    const falloff = d.dot(d).negate().div(u.pointerRadius.mul(u.pointerRadius)).exp().mul(u.pointerStrength);
    If(falloff.greaterThan(0.001), () => {
      const dir = d.normalize();
      const swirl = vec3(dir.y.negate(), dir.x, 0);
      acc.addAssign(vec3(dir, 0.35).mul(3.2).add(swirl.mul(2.4)).mul(falloff));
      acc.xy.addAssign(u.pointerVel.mul(falloff).mul(6));
    });

    // Hold to charge: everything is sucked towards the press in a tightening
    // spiral, trembling harder the longer it's held.
    If(u.charge.greaterThan(0.001), () => {
      const toward = u.chargePos.sub(p.xy);
      const dist = toward.length();
      const dir = toward.div(dist.add(0.001));
      const pull = smoothstep(0.04, 0.5, dist).mul(u.charge).mul(seed.mul(8).add(14));
      acc.xy.addAssign(dir.mul(pull).add(vec2(dir.y.negate(), dir.x).mul(u.charge.mul(5))));
      acc.z.addAssign(p.z.mul(u.charge).mul(-3));
      const shake = vec2(time.mul(53).add(seed.mul(91)).sin(), time.mul(61).add(seed.mul(57)).cos());
      acc.xy.addAssign(shake.mul(u.charge.mul(u.charge).mul(10)));
    });

    // Click shockwave: an expanding ring that kicks particles outward as it
    // passes. A charged release is bigger, faster and wider (a supernova).
    If(u.shockAge.lessThan(2.5), () => {
      const rel = p.xy.sub(u.shockPos);
      const dist = rel.length();
      const ring = u.shockAge.mul(u.shockPower.mul(1.2).add(2.3));
      const band = dist.sub(ring).abs().div(u.shockPower.mul(0.3).add(0.15)).oneMinus().saturate();
      const fade = u.shockAge.mul(-1.4).exp();
      const push = rel.div(dist.add(0.001)).mul(band.mul(fade).mul(u.shockPower).mul(38));
      acc.addAssign(vec3(push, band.mul(fade).mul(6)));
    });

    const damp = u.damping.pow(u.dt.mul(60));
    const v = vel.xyz.mul(damp).add(acc.mul(u.dt));
    vel.assign(vec4(v, 0));
    pos.assign(vec4(p.add(v.mul(u.dt)), 1));
  })().compute(count);

  // Pink on white: normal alpha blending (additive light vanishes on a white
  // page). Slow particles sit between blush and hot pink; speed pushes them to
  // deep rose, with a slow magenta shimmer travelling through the field.
  const material = new THREE.SpriteNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const vel = velocities.toAttribute().xyz;
  const posAttr = positions.toAttribute().xyz;
  const seed = hash(instanceIndex);
  const speed = vel.length();
  // Linear-space versions of #f9a8d4, #ec4899, #be185d and #c026d3.
  const blush = vec3(0.947, 0.392, 0.658);
  const pink = vec3(0.838, 0.064, 0.319);
  const rose = vec3(0.515, 0.009, 0.11);
  const magenta = vec3(0.527, 0.019, 0.657);
  const base = mix(pink, blush, seed.mul(0.55).add(posAttr.y.mul(0.08)).saturate());
  const fast = mix(base, rose, speed.mul(0.35).add(u.energy.mul(0.3)).saturate());
  const shimmer = seed.add(posAttr.x.mul(0.15)).add(time.mul(0.05)).mul(Math.PI * 2).sin().mul(0.5).add(0.5).pow(3);
  const shimmered = mix(fast, magenta, shimmer.mul(0.35));
  // Mood: lean towards the time-of-day tint, keeping per-particle variation.
  const moodColor = u.moodTint.mul(seed.mul(0.5).add(0.75));
  const moody = mix(shimmered, moodColor, u.moodMix.mul(0.9));
  // Charging glow: particles near the press heat up towards white-pink and swell.
  const toCharge = posAttr.xy.sub(u.chargePos);
  const glow = toCharge.dot(toCharge).negate().div(0.6).exp().mul(u.charge);
  const tint = mix(moody, vec3(1, 0.62, 0.82), glow.mul(0.7));
  const disc = uv().sub(0.5).length().mul(2).oneMinus().saturate().pow(1.25);

  material.positionNode = posAttr;
  material.colorNode = tint;
  material.opacityNode = disc.mul(u.opacity);
  // Scroll streaks: sprites stretch vertically (and thin out) with scroll speed.
  const stretch = u.streak.abs().mul(0.28).min(4).mul(seed.mul(0.8).add(0.6));
  material.scaleNode = u.size
    .mul(seed.mul(0.9).add(0.45))
    .mul(speed.mul(0.1).add(1).min(1.6))
    .mul(glow.mul(0.8).add(1))
    .mul(vec2(float(1).div(stretch.mul(0.25).add(1)), stretch.add(1)));

  const sprite = new THREE.Sprite(material);
  sprite.count = count;
  sprite.frustumCulled = false;

  return {
    update,
    sprite,
    reducedMotion,
    u,
    baseTurbulence: u.turbulence.value,
    basePointerStrength: u.pointerStrength.value,
    /** Mood values as currently shown, easing towards `sceneState.mood`. */
    mood: { turbulence: 1, calm: 1, energy: 0, tintMix: 0, tint: [0.838, 0.064, 0.319] },
    nextStorm: 0,
    pointerLast: { x: 0, y: 0 },
    scroll: { y: -1, speed: 0 },
    fps: { frames: 0, elapsed: 0 },
    fieldTex,
    engine: null as Engine | null,
    word: null as string | null,
    hoverTarget: 0,
    /** Rasterise `word` into the hover target (cached), or release it. */
    setWord(word: string | null) {
      if (word === this.word) return;
      this.word = word;
      if (!word) {
        this.hoverTarget = 0;
        return;
      }
      const key = `${count}:${word}`;
      let shape = wordCache.get(key);
      if (!shape) {
        // Projects become a sculpture of what they are; anything else is spelled.
        shape = sculptureFor(word, count) ?? textShape(count, word, font);
        wordCache.set(key, shape);
      }
      (wordTex.image.data as Float32Array).set(shape);
      wordTex.needsUpdate = true;
      this.hoverTarget = 1;
    },
    /** White page: alpha-blended pink. Dark page: additive, so dense areas glow. */
    setDark(dark: boolean) {
      material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      material.needsUpdate = true;
      u.opacity.value = dark ? 0.5 : 0.85;
    },
    dispose() {
      material.dispose();
      fieldTex.dispose();
      wordTex.dispose();
      targets.forEach((tex) => tex.dispose());
    },
  };
}

export type Simulation = ReturnType<typeof createSimulation>;

/** Advance one frame: map scroll + pointer to uniforms, then dispatch the compute kernel. */
export function stepSimulation(sim: Simulation, gl: THREE.WebGPURenderer, frame: FrameInput) {
  const { delta, width, height } = frame;
  const reducedMotion = sim.reducedMotion;

  const dt = Math.min(delta, 1 / 30);
  const { u } = sim;
  const aspect = width / height;
  const halfH = Math.tan(THREE.MathUtils.degToRad(frame.fov / 2)) * CAMERA_Z;
  const halfW = halfH * aspect;

  const scroll = readScrollTargets(height);
  const fit = Math.min(halfH * 0.85, halfW * 0.78);
  const wide = aspect > 1.1;
  const now = frame.elapsed;
  const spinAngle = (shape: number) =>
    SHAPES[shape] === "initials" ? Math.sin(now * 0.35) * 0.1 : now * SPIN[SHAPES[shape]] * (reducedMotion ? 0.4 : 1);

  if (scroll) {
    const { from, to, t } = scroll;
    u.from.value = from.shape;
    u.to.value = to.shape;
    u.blend.value = t;
    u.rotFrom.value = spinAngle(from.shape);
    u.rotTo.value = spinAngle(to.shape);
    const scale = THREE.MathUtils.lerp(from.scale, to.scale, t);
    const x = wide ? THREE.MathUtils.lerp(from.x, to.x, t) : 0;
    const y = THREE.MathUtils.lerp(from.y, to.y, t);
    u.scale.value = fit * scale;
    u.offset.value.set(x * halfW, y * halfH, 0);
  } else {
    u.from.value = 1;
    u.to.value = 1;
    u.blend.value = 0;
    u.rotFrom.value = u.rotTo.value = spinAngle(1);
    u.scale.value = fit * 0.8;
    u.offset.value.set(0, 0, 0);
  }

  const ptr = sceneState.pointer;
  u.fieldScale.value.set(halfW * 2, halfH * 2);

  // Rust smooths the pointer and drives the C++ fluid solver; fall back to the
  // raw pointer until the WebAssembly module has loaded.
  let nx = ptr.x;
  let ny = ptr.y;
  const engine = sim.engine;
  if (engine) {
    engine.frame(delta, ptr.x, ptr.y, ptr.active, aspect);
    nx = engine.state[STATE.POINTER_X];
    ny = engine.state[STATE.POINTER_Y];
    // Point the texture at the view over wasm memory: the upload reads straight from it.
    (sim.fieldTex.image as { data: Uint16Array }).data = engine.field;
    sim.fieldTex.needsUpdate = true;
  }

  const px = nx * halfW;
  const py = ny * halfH;
  if (ptr.active) {
    u.pointer.value.set(px, py, 0);
    u.pointerVel.value.set(px - sim.pointerLast.x, py - sim.pointerLast.y).divideScalar(Math.max(dt, 1e-3) * 60);
  } else {
    u.pointer.value.set(99, 99, 0);
    u.pointerVel.value.set(0, 0);
  }
  sim.pointerLast = { x: px, y: py };

  // Hovered word: fade in/out and fit it across the middle of the screen. A
  // name typed into the hero wins while the hero is in view, and sits higher
  // so it stays clear of the text and the phone keyboard.
  const name = sceneState.name && window.scrollY < height * 0.6 ? sceneState.name : null;
  // Left alone for a while, the field slowly asks if you're still there.
  const idle = !reducedMotion && !name && performance.now() - sceneState.lastInput > IDLE_AFTER;
  sim.setWord(name ?? (idle ? IDLE_WORD : sceneState.word));
  u.hover.value += (sim.hoverTarget - u.hover.value) * Math.min(1, dt * (idle ? 0.9 : 5));
  u.wordScale.value = Math.min(halfW * 0.8, halfH * 1.4);
  u.wordOffset.value.set(0, halfH * (name ? 0.3 : 0.05), 0.3);

  // Scroll speed → streaks. Jumps (anchor links, page changes) are capped.
  const sc = sim.scroll;
  const scrollY = window.scrollY;
  const rawSpeed = sc.y < 0 || reducedMotion ? 0 : ((scrollY - sc.y) / Math.max(delta, 1e-3)) * ((halfH * 2) / height);
  sc.y = scrollY;
  sc.speed += (THREE.MathUtils.clamp(rawSpeed, -16, 16) - sc.speed) * Math.min(1, dt * 8);
  if (Math.abs(sc.speed) < 0.01) sc.speed = 0;
  u.streak.value = sc.speed;

  // Device tilt (phones): -1..1 per axis → sideways acceleration in world units.
  u.tilt.value.set(sceneState.tilt.x * 2.2, sceneState.tilt.y * 1.6);

  const shock = sceneState.shock;
  shock.age += dt;
  u.shockAge.value = shock.age;
  u.shockPower.value = shock.power;

  // Hold to charge: builds after a short press so plain taps stay taps.
  const charge = sceneState.charge;
  if (charge.held && !reducedMotion && performance.now() - charge.since > 250) {
    charge.level = Math.min(1, charge.level + dt / 1.4);
    sceneState.energy = Math.max(sceneState.energy, charge.level * 0.8);
  }
  u.charge.value = charge.level;
  u.chargePos.value.set(charge.x * halfW, charge.y * halfH);
  u.pointerStrength.value = sim.basePointerStrength * (1 - charge.level * 0.7);
  u.shockPos.value.set(shock.x * halfW, shock.y * halfH);

  // Mood (Lagos time of day and weather): ease over a few seconds, never snap.
  const mood = sim.mood;
  const target = sceneState.mood;
  const k = 1 - Math.exp(-Math.min(delta, 0.5) * 0.6); // real time, so slow devices ease at the same pace
  mood.turbulence += (target.turbulence - mood.turbulence) * k;
  mood.calm += (target.calm - mood.calm) * k;
  mood.energy += (target.energy - mood.energy) * k;
  mood.tintMix += (target.tintMix - mood.tintMix) * k;
  for (let i = 0; i < 3; i++) mood.tint[i] += (target.tint[i] - mood.tint[i]) * k;
  u.turbulence.value = sim.baseTurbulence * mood.turbulence;
  u.moodMix.value = mood.tintMix;
  u.moodTint.value.setRGB(mood.tint[0], mood.tint[1], mood.tint[2]);
  // Storms: now and then a soft flash ripples through the field.
  if (mood.energy > 0.2 && !reducedMotion && now > sim.nextStorm) {
    if (sim.nextStorm > 0 && shock.age > 3) {
      shock.x = Math.random() * 1.6 - 0.8;
      shock.y = Math.random() * 1.2 - 0.6;
      shock.age = 0;
    }
    sim.nextStorm = now + 7 + Math.random() * 8;
  }

  // Other visitors: glide towards their latest reported position and stir the
  // fluid along the way, so their cursors ripple the particles and the ink.
  const glide = 1 - Math.exp(-dt * 10);
  for (const peer of peers.values()) {
    const x = peer.x + (peer.tx - peer.x) * glide;
    const y = peer.y + (peer.ty - peer.y) * glide;
    if (engine && !reducedMotion) engine.stir(peer.x, peer.y, x, y, dt, aspect);
    peer.x = x;
    peer.y = y;
  }

  sceneState.energy = Math.max(0, sceneState.energy - dt * 0.8);
  u.energy.value = THREE.MathUtils.lerp(u.energy.value, Math.max(sceneState.energy, mood.energy), 0.08);
  // Rain slows the whole field slightly; a clear day runs at normal speed.
  u.dt.value = dt * mood.calm;

  gl.compute(sim.update);

  const w = sim.fps;
  w.frames++;
  w.elapsed += delta;
  if (w.elapsed >= 0.5) {
    setStats({ fps: Math.round(w.frames / w.elapsed), engineMs: engine ? engine.stepMs : null });
    w.frames = 0;
    w.elapsed = 0;
  }
}
