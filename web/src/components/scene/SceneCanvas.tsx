"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import type { WebGLRenderer } from "three";
import { ParticleField } from "./ParticleField";
import { PostFX } from "./PostFX";
import { sceneState, setStats } from "@/lib/scene-store";
import { site } from "@/content/site";
import { getTheme, subscribeTheme } from "@/lib/theme";

type Budget = { count: number; size: number; quality: "high" | "low" };

function pickBudget(isWebGPU: boolean): Budget {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (!isWebGPU) return coarse || cores <= 4 ? { count: 24_576, size: 0.024, quality: "low" } : { count: 65_536, size: 0.019, quality: "high" };
  if (coarse || cores <= 4) return { count: 49_152, size: 0.018, quality: "low" };
  return { count: 131_072, size: 0.013, quality: "high" };
}

/** "webgpu" is opt-in (?renderer=webgpu) until verified on real hardware; WebGL 2 is the default. */
type Backend = "webgpu" | "webgl" | "static";

/**
 * three.js sets `swizzle: "rgba"` on every texture view. Chrome builds that
 * shipped the earlier draft of that WebGPU field reject the string and the
 * device is lost. "rgba" is the identity swizzle, so dropping it is a no-op
 * everywhere else.
 */
function patchIdentitySwizzle() {
  if (typeof GPUTexture === "undefined") return;
  const proto = GPUTexture.prototype as GPUTexture & { __swizzlePatched?: boolean };
  if (proto.__swizzlePatched) return;
  const createView = proto.createView;
  proto.createView = function (this: GPUTexture, descriptor?: GPUTextureViewDescriptor) {
    if (descriptor && (descriptor as { swizzle?: string }).swizzle === "rgba") {
      const rest: GPUTextureViewDescriptor & { swizzle?: string } = { ...descriptor };
      delete rest.swizzle;
      return createView.call(this, rest);
    }
    return createView.call(this, descriptor);
  };
  proto.__swizzlePatched = true;
}

function initialBackend(): Backend {
  const forced = new URLSearchParams(window.location.search).get("renderer");
  if (forced === "webgpu" && "gpu" in navigator) return "webgpu";
  return "webgl";
}

/** Software rasterisers (GPU acceleration off or blocklisted) run the scene at ~1 fps. */
function isSoftwareRenderer(renderer: THREE.WebGPURenderer) {
  if (new URLSearchParams(window.location.search).has("renderer")) return false; // explicit choice wins
  const gl = (renderer.backend as { gl?: WebGL2RenderingContext }).gl;
  if (!gl) return false;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
}

/**
 * Frame-rate watchdog: after a warm-up, drop to 1× pixel ratio if the scene is
 * slow, and give up on it (static backdrop) if it's still too slow after that.
 */
function useFrameWatchdog(onGiveUp: (reason: string) => void) {
  const setDpr = useThree((s) => s.setDpr);
  // An explicit ?renderer= choice (debugging, testing) disables the watchdog.
  const w = useRef({ frames: 0, elapsed: 0, stage: new URLSearchParams(window.location.search).has("renderer") ? 2 : 0 });
  useFrame((_, delta) => {
    const s = w.current;
    if (s.stage >= 2 || document.hidden) return;
    s.frames++;
    s.elapsed += Math.min(delta, 1);
    if (s.elapsed < 3) return;
    const fps = s.frames / s.elapsed;
    s.frames = 0;
    s.elapsed = 0;
    if (fps >= 30) {
      s.stage = 2; // healthy; stop watching
    } else if (s.stage === 0) {
      s.stage = 1;
      setDpr(1);
    } else if (fps < 20) {
      s.stage = 2;
      onGiveUp(`sustained ${fps.toFixed(1)} fps`);
    } else {
      s.stage = 2;
    }
  });
}

function Scene({
  reducedMotion,
  onReady,
  onGiveUp,
}: {
  reducedMotion: boolean;
  onReady: () => void;
  onGiveUp: (reason: string) => void;
}) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  useFrameWatchdog(onGiveUp);
  const [isWebGPU] = useState(() => (gl.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true);
  const [budget] = useState(() => pickBudget(isWebGPU));
  const [postFX] = useState(() => new URLSearchParams(window.location.search).get("fx") !== "0");

  useEffect(() => {
    setStats({ backend: isWebGPU ? "WebGPU" : "WebGL 2", particles: budget.count });
  }, [isWebGPU, budget]);

  // Reveal once the first frame with particles has been drawn.
  const shown = useRef(false);
  useFrame(() => {
    if (!shown.current) {
      shown.current = true;
      onReady();
    }
  });

  return (
    <>
      <ParticleField
        count={budget.count}
        size={budget.size}
        reducedMotion={reducedMotion}
        text={site.initials}
      />
      {postFX && <PostFX quality={budget.quality} />}
    </>
  );
}

class SceneBoundary extends Component<{ children: ReactNode; onError: (error: unknown) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function SceneCanvas() {
  const [ready, setReady] = useState(false);
  const [backend, setBackend] = useState<Backend>(initialBackend);
  const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // WebGPU failed (init error, lost device, validation error) → retry on WebGL 2;
  // WebGL failed or is too slow → animated static backdrop.
  const degrade = useCallback((reason: unknown) => {
    console.warn("[scene] renderer failed, degrading:", reason);
    setReady(false);
    setBackend((b) => (b === "webgpu" ? "webgl" : "static"));
  }, []);
  const giveUp = useCallback((reason: unknown) => {
    console.warn("[scene] too slow for the particle scene, using static backdrop:", reason);
    setReady(false);
    setBackend("static");
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      sceneState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      sceneState.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      sceneState.pointer.active = e.pointerType === "mouse" || e.pressure > 0;
    };
    const leave = () => {
      sceneState.pointer.active = false;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") leave();
    };
    // Clicks on the page (not on controls or form fields) send a shockwave through the particles.
    const shock = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest("input, textarea, select, label, [role=dialog]")) return;
      sceneState.shock.x = (e.clientX / window.innerWidth) * 2 - 1;
      sceneState.shock.y = -(e.clientY / window.innerHeight) * 2 + 1;
      sceneState.shock.age = 0;
      sceneState.energy = Math.max(sceneState.energy, 0.8);
    };
    window.addEventListener("pointerdown", shock, { passive: true });

    // Hovering anything with data-particles makes the field spell its word.
    const over = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const word = (e.target as Element | null)?.closest<HTMLElement>("[data-particles]")?.dataset.particles ?? null;
      sceneState.word = word;
    };
    window.addEventListener("pointerover", over, { passive: true });

    // Phones: tilting the device sloshes the particles. iOS asks permission,
    // which must come from a tap, so request it on the first one.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const orient = (e: DeviceOrientationEvent) => {
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      sceneState.tilt.x = clamp((e.gamma ?? 0) / 35);
      sceneState.tilt.y = clamp(-((e.beta ?? 45) - 45) / 35);
    };
    type OrientationWithPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
    const Orientation = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : null) as OrientationWithPermission | null;
    const askTilt = () => {
      Orientation?.requestPermission?.()
        .then((state) => state === "granted" && window.addEventListener("deviceorientation", orient))
        .catch(() => {});
    };
    if (coarse && Orientation) {
      if (typeof Orientation.requestPermission === "function") window.addEventListener("pointerdown", askTilt, { once: true });
      else window.addEventListener("deviceorientation", orient);
    }
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointerdown", shock);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", askTilt);
      window.removeEventListener("deviceorientation", orient);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  useEffect(() => {
    setStats({ motion: reducedMotion ? "Reduced" : "Full" });
  }, [reducedMotion]);

  useEffect(() => {
    if (backend === "static") setStats({ backend: "Static", particles: 0, fps: 0 });
  }, [backend]);

  if (backend === "static") return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 print:hidden transition-opacity duration-[1600ms] ease-out"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <SceneBoundary key={backend} onError={degrade}>
        <Canvas
          key={backend}
          flat
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 6], fov: 35, near: 0.1, far: 50 }}
          gl={async (props) => {
            if (backend === "webgpu") patchIdentitySwizzle();
            const renderer = new THREE.WebGPURenderer({
              canvas: props.canvas as HTMLCanvasElement,
              forceWebGL: backend === "webgl",
              antialias: false,
              alpha: false,
              powerPreference: "high-performance",
            });
            try {
              await renderer.init();
            } catch (error) {
              degrade(error);
              throw error;
            }
            renderer.onDeviceLost = (info) => degrade(info.message);
            const device = (renderer.backend as { device?: GPUDevice }).device;
            device?.addEventListener("uncapturederror", (e) => degrade((e as GPUUncapturedErrorEvent).error.message));
            if (isSoftwareRenderer(renderer)) {
              // Throwing here lands in SceneBoundary → static backdrop.
              giveUp("software renderer");
              throw new Error("software renderer");
            }
            // No tone mapping, so the clear colour matches the page exactly.
            const syncClear = () => renderer.setClearColor(getTheme() === "dark" ? 0x09090b : 0xffffff, 1);
            syncClear();
            subscribeTheme(syncClear);
            renderer.toneMapping = THREE.NoToneMapping;
            return renderer as unknown as WebGLRenderer;
          }}
          onCreated={(state) => state.gl.domElement.setAttribute("tabindex", "-1")}
        >
          <Scene reducedMotion={reducedMotion} onReady={() => setReady(true)} onGiveUp={giveUp} />
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
