"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three/webgpu";
import { loadEngine } from "@/lib/engine";
import { createSimulation, stepSimulation, type Simulation, type SimulationOptions } from "./simulation";

export function ParticleField({ count, size, reducedMotion, text }: SimulationOptions) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const scene = useThree((s) => s.scene);
  const sim = useRef<Simulation | null>(null);

  useEffect(() => {
    const next = createSimulation({ count, size, reducedMotion, text });
    sim.current = next;
    scene.add(next.sprite);
    let cancelled = false;
    loadEngine().then((engine) => {
      if (!cancelled) next.engine = engine;
    });
    return () => {
      cancelled = true;
      scene.remove(next.sprite);
      next.dispose();
      sim.current = null;
    };
  }, [scene, count, size, reducedMotion, text]);

  useFrame((state, delta) => {
    if (!sim.current) return;
    stepSimulation(sim.current, gl, {
      delta,
      elapsed: state.clock.elapsedTime,
      width: state.size.width,
      height: state.size.height,
      fov: (state.camera as THREE.PerspectiveCamera).fov,
    });
  });

  return null;
}
