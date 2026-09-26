"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Fn, float, pass, screenUV, time, uniform, vec2, vec4 } from "three/tsl";
import { chromaticAberration } from "three/addons/tsl/display/ChromaticAberrationNode.js";
import { sceneState } from "@/lib/scene-store";

/**
 * Post chain: chromatic aberration → film grain.
 * Written in TSL, which compiles to WGSL on WebGPU and GLSL on the WebGL 2 fallback.
 */
export function PostFX({ quality }: { quality: "high" | "low" }) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const fx = useRef<{ pipeline: THREE.RenderPipeline; aberration: THREE.UniformNode<"float", number> } | null>(null);

  useEffect(() => {
    const scenePass = pass(scene, camera);
    const color = scenePass.getTextureNode("output");
    // Bloom is dropped for the white theme (it only washes the page out); a
    // light lens fringe that swells with cursor energy, plus fine grain, remain.
    const aberration = uniform(0.04);
    const lens = chromaticAberration(color, aberration, vec2(0.5), float(1.05));

    const grade = Fn(() => {
      const c = lens as unknown as THREE.Node<"vec4">;
      const grain = screenUV.dot(vec2(12.9898, 78.233)).add(time.fract()).sin().mul(43758.5453).fract().sub(0.5).mul(quality === "high" ? 0.018 : 0.012);
      return vec4(c.rgb.add(grain).clamp(0, 1), 1);
    });

    const pipeline = new THREE.RenderPipeline(gl);
    pipeline.outputNode = grade();
    fx.current = { pipeline, aberration };
    return () => {
      pipeline.dispose();
      fx.current = null;
    };
  }, [gl, scene, camera, quality]);

  useFrame(() => {
    if (!fx.current) return;
    const { pipeline, aberration } = fx.current;
    aberration.value = THREE.MathUtils.lerp(aberration.value, 0.04 + sceneState.energy * 0.35, 0.1);
    pipeline.render();
  }, 1);

  return null;
}
