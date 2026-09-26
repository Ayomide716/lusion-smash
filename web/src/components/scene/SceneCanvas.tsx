"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
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

/**
 * Decide whether WebGPU is safe to use. Some shipped Chrome builds expose WebGPU
 * but reject descriptors three.js always sends (texture view `swizzle`), which
 * loses the device mid-frame. Probing once up front lets us pick WebGL 2 instead.
 */
async function webgpuUsable(): Promise<boolean> {
  if (new URLSearchParams(window.location.search).get("renderer") === "webgl") return false;
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) return false;
    const device = await adapter.requestDevice();
    try {
      const texture = device.createTexture({
        size: [1, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING,
      });
      texture.createView({ swizzle: "rgba" } as GPUTextureViewDescriptor);
      texture.destroy();
      return true;
    } finally {
      device.destroy();
    }
  } catch {
    return false;
  }
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

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[scene] falling back to static backdrop:", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function SceneCanvas() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

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
    if (failed) setStats({ backend: "Static", particles: 0, fps: 0 });
  }, [failed]);

  if (failed) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 print:hidden transition-opacity duration-[1600ms] ease-out"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <SceneBoundary onError={() => setFailed(true)}>
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 6], fov: 35, near: 0.1, far: 50 }}
          gl={async (props) => {
            const renderer = new THREE.WebGPURenderer({
              canvas: props.canvas as HTMLCanvasElement,
              forceWebGL: !(await webgpuUsable()),
              antialias: false,
              alpha: false,
              powerPreference: "high-performance",
            });
            await renderer.init();
            renderer.onDeviceLost = (info) => {
              console.warn("[scene] GPU device lost:", info.message);
              setFailed(true);
            };
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
