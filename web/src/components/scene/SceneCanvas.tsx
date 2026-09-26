"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import type { WebGLRenderer } from "three";
import { ParticleField } from "./ParticleField";
import { PostFX } from "./PostFX";
import { sceneState, setStats } from "@/lib/scene-store";
import { site } from "@/content/site";

type Budget = { count: number; size: number; quality: "high" | "low" };

function pickBudget(isWebGPU: boolean): Budget {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (!isWebGPU) return { count: coarse ? 16_384 : 32_768, size: 0.022, quality: "low" };
  if (coarse || cores <= 4) return { count: 49_152, size: 0.018, quality: "low" };
  return { count: 131_072, size: 0.013, quality: "high" };
}

type Backend = "auto" | "webgl" | "static";

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
  if (forced === "webgl") return "webgl";
  return "gpu" in navigator ? "auto" : "webgl";
}

function Scene({ reducedMotion, onReady }: { reducedMotion: boolean; onReady: () => void }) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
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

  // WebGPU failed (init error or lost device) → retry on WebGL 2; WebGL failed → static backdrop.
  const degrade = useCallback((reason: unknown) => {
    console.warn("[scene] renderer failed, degrading:", reason);
    setReady(false);
    setBackend((b) => (b === "auto" ? "webgl" : "static"));
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
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      window.removeEventListener("pointerup", up);
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
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 6], fov: 35, near: 0.1, far: 50 }}
          gl={async (props) => {
            if (backend === "auto") patchIdentitySwizzle();
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
            renderer.setClearColor(0x05060a, 1);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.05;
            return renderer as unknown as WebGLRenderer;
          }}
          onCreated={(state) => state.gl.domElement.setAttribute("tabindex", "-1")}
        >
          <Scene reducedMotion={reducedMotion} onReady={() => setReady(true)} />
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
