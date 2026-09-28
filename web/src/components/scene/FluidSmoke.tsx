"use client";

import { useEffect, useRef, useState } from "react";
import { sceneState } from "@/lib/scene-store";
import { onRipple, peers } from "@/lib/presence";
import { getTheme } from "@/lib/theme";
import { InkTrail } from "./InkTrail";

// GPU smoke: a stable-fluids solver (advect → vorticity → divergence →
// Jacobi pressure → project) running in WebGL 2 fragment shaders on half-float
// textures, with dye at a finer resolution than the velocity grid. Stirred by
// the cursor, other visitors' cursors and taps, and clicks. Falls back to the
// CPU (WebAssembly) ink trail where float render targets aren't available.

const SIM = 128; // velocity grid, short side
const DYE = 512; // dye grid, short side
const PRESSURE_ITERATIONS = 20;
const CURL = 26;
const VELOCITY_DISSIPATION = 0.25;
const DYE_DISSIPATION = 1.1;
const RADIUS = 0.0022;
const FORCE = 5200;
const IDLE_MS = 8000; // stop simulating once nothing has stirred it for a while

const VERT = `#version 300 es
in vec2 aPos;
uniform vec2 texel;
out vec2 vUv, vL, vR, vT, vB;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texel.x, 0.0); vR = vUv + vec2(texel.x, 0.0);
  vT = vUv + vec2(0.0, texel.y); vB = vUv - vec2(0.0, texel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv, vL, vR, vT, vB;
out vec4 o;
`;

const FRAG = {
  splat: `${HEAD}
uniform sampler2D uTarget; uniform float aspect, radius; uniform vec3 color; uniform vec2 point;
void main() {
  vec2 p = vUv - point; p.x *= aspect;
  o = vec4(texture(uTarget, vUv).xyz + exp(-dot(p, p) / radius) * color, 1.0);
}`,
  advect: `${HEAD}
uniform sampler2D uVelocity, uSource; uniform vec2 velTexel; uniform float dt, dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * velTexel;
  o = vec4(texture(uSource, coord).rgb / (1.0 + dissipation * dt), 1.0);
}`,
  divergence: `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
  curl: `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
  vorticity: `${HEAD}
uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
void main() {
  float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C; force.y *= -1.0;
  o = vec4(clamp(texture(uVelocity, vUv).xy + force * dt, -1000.0, 1000.0), 0.0, 1.0);
}`,
  pressure: `${HEAD}
uniform sampler2D uPressure, uDivergence;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  o = vec4((L + R + B + T - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`,
  gradient: `${HEAD}
uniform sampler2D uPressure, uVelocity;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  o = vec4(texture(uVelocity, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
}`,
  scale: `${HEAD}
uniform sampler2D uTexture; uniform float value;
void main() { o = value * texture(uTexture, vUv); }`,
  display: `${HEAD}
uniform sampler2D uDye; uniform float opacity;
void main() {
  vec3 c = texture(uDye, vUv).rgb;
  float a = clamp(max(c.r, max(c.g, c.b)) * 1.15, 0.0, 1.0) * opacity;
  vec3 hue = c / (max(c.r, max(c.g, c.b)) + 1e-4);
  o = vec4(hue * a, a); // premultiplied
}`,
} as const;

type Target = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };
type Double = { read: Target; write: Target; swap(): void };

/** Can this device run the GPU smoke? (WebGL 2 with float render targets, fine pointer, hardware GPU) */
function supported() {
  if (!window.matchMedia("(pointer: fine)").matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const probe = document.createElement("canvas").getContext("webgl2");
  if (!probe || !probe.getExtension("EXT_color_buffer_float")) return false;
  const info = probe.getExtension("WEBGL_debug_renderer_info");
  const name = String(info ? probe.getParameter(info.UNMASKED_RENDERER_WEBGL) : probe.getParameter(probe.RENDERER));
  probe.getExtension("WEBGL_lose_context")?.loseContext();
  // ?smoke forces it on (testing on machines without a GPU).
  return new URLSearchParams(window.location.search).has("smoke") || !/swiftshader|llvmpipe|softpipe|software/i.test(name);
}

export function FluidSmoke() {
  const [mode, setMode] = useState<"pending" | "gpu" | "fallback">("pending");
  useEffect(() => {
    // Decided after mount: it depends on the device.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(supported() ? "gpu" : "fallback");
  }, []);
  if (mode === "fallback") return <InkTrail />;
  if (mode === "pending") return null;
  return <SmokeCanvas onFail={() => setMode("fallback")} />;
}

function SmokeCanvas({ onFail }: { onFail: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!canvas || !gl || !gl.getExtension("EXT_color_buffer_float")) {
      onFail();
      return;
    }

    // --- GL plumbing -------------------------------------------------------
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const vert = compile(gl.VERTEX_SHADER, VERT);
    type Program = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
    let programs: Record<keyof typeof FRAG, Program>;
    try {
      programs = Object.fromEntries(
        Object.entries(FRAG).map(([name, src]) => {
          const p = gl.createProgram()!;
          gl.attachShader(p, vert);
          gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src));
          gl.bindAttribLocation(p, 0, "aPos");
          gl.linkProgram(p);
          if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
          const u: Program["u"] = {};
          const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
          for (let i = 0; i < n; i++) {
            const name = gl.getActiveUniform(p, i)!.name;
            u[name] = gl.getUniformLocation(p, name);
          }
          return [name, { p, u }];
        }),
      ) as Record<keyof typeof FRAG, Program>;
    } catch (error) {
      console.warn("[smoke] falling back to the ink trail:", error);
      onFail();
      return;
    }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const target = (w: number, h: number, internal: number, format: number): Target => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex, fb, w, h };
    };
    const double = (w: number, h: number, internal: number, format: number): Double => {
      const d = { read: target(w, h, internal, format), write: target(w, h, internal, format), swap() {
        [d.read, d.write] = [d.write, d.read];
      } };
      return d;
    };
    const size = (short: number) => {
      const aspect = window.innerWidth / window.innerHeight;
      return aspect >= 1 ? [Math.round(short * aspect), short] : [short, Math.round(short / aspect)];
    };

    let velocity: Double, dye: Double, pressure: Double, divergence: Target, curl: Target;
    const allocate = () => {
      const [sw, sh] = size(SIM);
      const [dw, dh] = size(DYE);
      velocity = double(sw, sh, gl.RG16F, gl.RG);
      dye = double(dw, dh, gl.RGBA16F, gl.RGBA);
      pressure = double(sw, sh, gl.R16F, gl.RED);
      divergence = target(sw, sh, gl.R16F, gl.RED);
      curl = target(sw, sh, gl.R16F, gl.RED);
      // Smoke is soft: half the screen's resolution is plenty.
      canvas.width = Math.round(window.innerWidth * 0.5);
      canvas.height = Math.round(window.innerHeight * 0.5);
    };
    allocate();

    const program = (name: keyof typeof FRAG) => {
      gl.useProgram(programs[name].p);
      return programs[name].u;
    };
    const bind = (u: WebGLUniformLocation | null, t: Target, unit: number) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.uniform1i(u, unit);
    };
    const draw = (out: Target | null, texelOf: Target) => {
      const w = out ? out.w : canvas.width;
      const h = out ? out.h : canvas.height;
      gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
      gl.viewport(0, 0, w, h);
      const prog = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram;
      gl.uniform2f(gl.getUniformLocation(prog, "texel"), 1 / texelOf.w, 1 / texelOf.h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // --- Input -> splats --------------------------------------------------
    const aspect = () => window.innerWidth / window.innerHeight;
    const colour = (strength: number): [number, number, number] => {
      // The site's pink, leaning towards the Lagos mood tint (linear → roughly sRGB).
      const m = sceneState.mood;
      const pink = [0.93, 0.28, 0.6];
      const tint = m.tint.map((v) => Math.pow(v, 1 / 2.2));
      const mix = m.tintMix * 0.9;
      return pink.map((p, i) => (p + (tint[i] - p) * mix) * strength) as [number, number, number];
    };
    let lastActive = -Infinity;
    const splat = (x: number, y: number, dx: number, dy: number, strength: number, radius = RADIUS) => {
      // x, y in uv (0..1, y up); dx, dy in uv per frame.
      lastActive = performance.now();
      const r = aspect() > 1 ? radius * aspect() : radius;
      let u = program("splat");
      bind(u.uTarget, velocity.read, 0);
      gl.uniform1f(u.aspect, aspect());
      gl.uniform2f(u.point, x, y);
      gl.uniform3f(u.color, dx * FORCE, dy * FORCE, 0);
      gl.uniform1f(u.radius, r);
      draw(velocity.write, velocity.read);
      velocity.swap();
      u = program("splat");
      bind(u.uTarget, dye.read, 0);
      gl.uniform1f(u.aspect, aspect());
      gl.uniform2f(u.point, x, y);
      gl.uniform3f(u.color, ...colour(strength));
      gl.uniform1f(u.radius, r);
      draw(dye.write, dye.read);
      dye.swap();
    };
    const burst = (x: number, y: number, strength: number) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        splat(x, y, Math.cos(a) * 0.004, Math.sin(a) * 0.004, strength, RADIUS * 3);
      }
    };
    const toUv = (x: number, y: number) => [(x + 1) / 2, (y + 1) / 2] as const; // NDC → uv

    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest("input, textarea, select, label, [role=dialog]")) return;
      burst(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight, 0.35);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    const offRipple = onRipple((x, y) => {
      const [u, v] = toUv(x, y);
      burst(u, v, 0.25);
    });
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(allocate, 200);
    };
    window.addEventListener("resize", onResize);

    // --- Step ---------------------------------------------------------------
    const last = { x: 0, y: 0, active: false };
    const peerLast = new Map<number, { x: number; y: number }>();
    let prev = performance.now();
    let frame = 0;

    const step = (dt: number) => {
      gl.disable(gl.BLEND);
      let u = program("curl");
      bind(u.uVelocity, velocity.read, 0);
      draw(curl, velocity.read);

      u = program("vorticity");
      bind(u.uVelocity, velocity.read, 0);
      bind(u.uCurl, curl, 1);
      gl.uniform1f(u.curl, CURL);
      gl.uniform1f(u.dt, dt);
      draw(velocity.write, velocity.read);
      velocity.swap();

      u = program("divergence");
      bind(u.uVelocity, velocity.read, 0);
      draw(divergence, velocity.read);

      u = program("scale");
      bind(u.uTexture, pressure.read, 0);
      gl.uniform1f(u.value, 0.8); // warm start
      draw(pressure.write, pressure.read);
      pressure.swap();

      u = program("pressure");
      bind(u.uDivergence, divergence, 1);
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
        bind(u.uPressure, pressure.read, 0);
        draw(pressure.write, pressure.read);
        pressure.swap();
      }

      u = program("gradient");
      bind(u.uPressure, pressure.read, 0);
      bind(u.uVelocity, velocity.read, 1);
      draw(velocity.write, velocity.read);
      velocity.swap();

      u = program("advect");
      bind(u.uVelocity, velocity.read, 0);
      bind(u.uSource, velocity.read, 1);
      gl.uniform2f(u.velTexel, 1 / velocity.read.w, 1 / velocity.read.h);
      gl.uniform1f(u.dt, dt);
      gl.uniform1f(u.dissipation, VELOCITY_DISSIPATION);
      draw(velocity.write, velocity.read);
      velocity.swap();

      u = program("advect");
      bind(u.uVelocity, velocity.read, 0);
      bind(u.uSource, dye.read, 1);
      gl.uniform2f(u.velTexel, 1 / velocity.read.w, 1 / velocity.read.h);
      gl.uniform1f(u.dt, dt);
      gl.uniform1f(u.dissipation, DYE_DISSIPATION);
      draw(dye.write, dye.read);
      dye.swap();
    };

    const render = () => {
      frame = requestAnimationFrame(render);
      if (document.hidden) return;
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 1 / 30);
      prev = now;

      // Local cursor.
      const p = sceneState.pointer;
      if (p.active && last.active) {
        const dx = (p.x - last.x) / 2;
        const dy = (p.y - last.y) / 2;
        if (dx !== 0 || dy !== 0) {
          const [u, v] = toUv(p.x, p.y);
          splat(u, v, dx, dy, 0.13);
        }
      }
      Object.assign(last, p);

      // Other visitors (their smoothed positions from the scene loop).
      for (const [id, peer] of peers) {
        const was = peerLast.get(id);
        if (was && (peer.x !== was.x || peer.y !== was.y)) {
          const [u, v] = toUv(peer.x, peer.y);
          splat(u, v, (peer.x - was.x) / 2, (peer.y - was.y) / 2, 0.12);
        }
        peerLast.set(id, { x: peer.x, y: peer.y });
      }
      for (const id of peerLast.keys()) if (!peers.has(id)) peerLast.delete(id);

      // Nothing stirring for a while and the smoke has faded: skip the work.
      if (now - lastActive > IDLE_MS) {
        return;
      }
      step(dt);

      const u = program("display");
      bind(u.uDye, dye.read, 0);
      gl.uniform1f(u.opacity, getTheme() === "dark" ? 0.75 : 0.55);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      draw(null, dye.read);
    };
    frame = requestAnimationFrame(render);

    const onLost = (e: Event) => {
      e.preventDefault();
      onFail();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onLost);
      offRipple();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [onFail]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-[5] h-full w-full print:hidden"
    />
  );
}
