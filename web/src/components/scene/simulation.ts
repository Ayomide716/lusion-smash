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
import { buildShapes, SHAPES, type ShapeName } from "./shapes";
import { sceneState, setStats } from "@/lib/scene-store";
import { FIELD_SIZE, STATE, type Engine } from "@/lib/engine";

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

type Section = { shape: number; x: number; y: number; scale: number };

/** Read the `[data-shape]` sections and work out which two shapes to blend between. */
function readScrollTargets(viewportH: number) {
  const nodes = document.querySelectorAll<HTMLElement>("[data-shape]");
  if (nodes.length === 0) return null;
  const anchor = viewportH * 0.6;
  let current = 0;
  const sections: (Section & { top: number })[] = [];
  nodes.forEach((el, i) => {
    const top = el.getBoundingClientRect().top;
    const shape = Math.max(0, SHAPES.indexOf(el.dataset.shape as ShapeName));
    sections.push({
      shape,
      x: Number(el.dataset.shapeX ?? 0),
      y: Number(el.dataset.shapeY ?? 0),
      scale: Number(el.dataset.shapeScale ?? 1),
      top,
    });
    if (top <= anchor) current = i;
  });
  const from = sections[current];
  const to = sections[Math.min(current + 1, sections.length - 1)];
  const start = viewportH * 1.1;
  const t = to === from ? 0 : THREE.MathUtils.clamp((start - to.top) / (start - anchor), 0, 1);
  return { from, to, t: t * t * (3 - 2 * t) };
}

export function createSimulation({ count, size, reducedMotion, text }: SimulationOptions) {
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const shapes = buildShapes(count, text, font);

  // Start as a wide cloud so the first frames read as the particles gathering.
  const start = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    if (reducedMotion) {
      start.set(shapes.initials.subarray(i * 4, i * 4 + 4), i * 4);
      continue;
    }
    const r = 2.5 + Math.random() * 4;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    start[i * 4] = r * Math.sin(ph) * Math.cos(th);
    start[i * 4 + 1] = r * Math.sin(ph) * Math.sin(th);
    start[i * 4 + 2] = r * Math.cos(ph) - 2;
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
    const target = mix(a, c, b).mul(u.scale).add(u.offset);

    const p = pos.xyz;
    const spring = select(dust, float(0.04), u.spring.mul(seed.mul(0.8).add(0.6)));
    const acc = target.sub(p).mul(spring).toVar();

    const flow = curlNoise(p.mul(0.55).add(vec3(0, time.mul(0.07), time.mul(0.11))));
    const churn = select(dust, float(0.6), u.energy.mul(1.5).add(0.35));
    acc.addAssign(flow.mul(u.turbulence).mul(churn));

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
  const tint = mix(fast, magenta, shimmer.mul(0.35));
  const disc = uv().sub(0.5).length().mul(2).oneMinus().saturate().pow(1.25);

  material.positionNode = posAttr;
  material.colorNode = tint;
  material.opacityNode = disc.mul(0.85);
  material.scaleNode = u.size.mul(seed.mul(0.9).add(0.45)).mul(speed.mul(0.1).add(1).min(1.6));

  const sprite = new THREE.Sprite(material);
  sprite.count = count;
  sprite.frustumCulled = false;

  return {
    update,
    sprite,
    reducedMotion,
    u,
    pointerLast: { x: 0, y: 0 },
    fps: { frames: 0, elapsed: 0 },
    fieldTex,
    engine: null as Engine | null,
    dispose() {
      material.dispose();
      fieldTex.dispose();
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

  sceneState.energy = Math.max(0, sceneState.energy - dt * 0.8);
  u.energy.value = THREE.MathUtils.lerp(u.energy.value, sceneState.energy, 0.08);
  u.dt.value = dt;

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
