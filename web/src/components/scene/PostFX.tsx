"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Fn, float, pass, screenUV, time, uniform, vec2, vec4 } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { chromaticAberration } from "three/addons/tsl/display/ChromaticAberrationNode.js";
import { sceneState } from "@/lib/scene-store";

/**
 * Cinematic post chain: bloom → chromatic aberration → vignette + grain.
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
    const glow = bloom(color, quality === "high" ? 1.1 : 0.8, 0.55, 0.12);
    const aberration = uniform(0.25);
    const lens = chromaticAberration(color.add(glow), aberration, vec2(0.5), float(1.1));

    const grade = Fn(() => {
      const c = lens as unknown as THREE.Node<"vec4">;
      const d = screenUV.sub(0.5).length();
      const vignette = float(1).sub(d.mul(d).mul(1.1)).clamp(0, 1);
      const grain = screenUV.dot(vec2(12.9898, 78.233)).add(time.fract()).sin().mul(43758.5453).fract().sub(0.5).mul(0.035);
      return vec4(c.rgb.mul(vignette).add(grain), 1);
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
    aberration.value = THREE.MathUtils.lerp(aberration.value, 0.25 + sceneState.energy * 0.9, 0.1);
    pipeline.render();
  }, 1);

  return null;
}
