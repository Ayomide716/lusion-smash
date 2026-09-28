"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Fn, float, floor, mix, pass, screenUV, smoothstep, time, uniform, vec2, vec3, vec4 } from "three/tsl";
import { chromaticAberration } from "three/addons/tsl/display/ChromaticAberrationNode.js";
import { sceneState } from "@/lib/scene-store";
import { getTheme } from "@/lib/theme";

// Sky colours per Lagos phase of day: multiplied over the white page in light
// mode, added over near-black in dark mode. Day in light mode is a pale blue.
const SKY = {
  light: { dawn: "#fed7aa", day: "#dbeafe", dusk: "#fdba74", night: "#ddd6fe" },
  dark: { dawn: "#5a2a12", day: "#0c1a33", dusk: "#4a1c0a", night: "#1e1b4b" },
} as const;

/**
 * Post chain: chromatic aberration → film grain.
 * Written in TSL, which compiles to WGSL on WebGPU and GLSL on the WebGL 2 fallback.
 */
export function PostFX({ quality }: { quality: "high" | "low" }) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  type Uniforms = {
    aberration: THREE.UniformNode<"float", number>;
    skyColor: THREE.UniformNode<"color", THREE.Color>;
    skyAmount: THREE.UniformNode<"float", number>;
    dark: THREE.UniformNode<"float", number>;
    rain: THREE.UniformNode<"float", number>;
  };
  const fx = useRef<({ pipeline: THREE.RenderPipeline } & Uniforms) | null>(null);
  const target = useRef(new THREE.Color(1, 1, 1));

  useEffect(() => {
    const scenePass = pass(scene, camera);
    const color = scenePass.getTextureNode("output");
    // Bloom is dropped for the white theme (it only washes the page out); a
    // light lens fringe that swells with cursor energy, plus fine grain, remain.
    const aberration = uniform(0.04);
    const skyColor = uniform(new THREE.Color(1, 1, 1));
    const skyAmount = uniform(0);
    const dark = uniform(0);
    const rain = uniform(0);
    const lens = chromaticAberration(color, aberration, vec2(0.5), float(1.05));

    const grade = Fn(() => {
      const c = lens as unknown as THREE.Node<"vec4">;
      const uv = screenUV;
      // Living sky: strongest at the top of the screen, gone by ~70% down.
      const towardsTop = smoothstep(0.72, 0.0, uv.y).mul(skyAmount);
      const lit = c.rgb.mul(mix(vec3(1), skyColor, towardsTop));
      const glow = c.rgb.add(skyColor.mul(towardsTop));
      const sky = mix(lit, glow, dark);
      // Rain: thin slanted streaks falling in a third of the columns.
      const x = uv.x.add(uv.y.mul(0.08)).mul(170);
      const col = floor(x);
      const seed = col.mul(12.9898).sin().mul(43758.5453).fract();
      const fall = uv.y.mul(seed.add(1.4)).sub(time.mul(seed.mul(1.1).add(1.3))).add(seed.mul(9)).fract();
      const streak = smoothstep(0.9, 1.0, fall).mul(smoothstep(0.66, 0.7, seed));
      const line = smoothstep(0.55, 1.0, x.fract().sub(0.5).abs().mul(2).oneMinus());
      const drop = streak.mul(line).mul(rain);
      // Light mode: slate-blue streaks (darkening white alone was nearly invisible); dark mode: soft highlights.
      const wet = mix(mix(sky, vec3(0.2, 0.26, 0.36), drop.mul(0.6)), sky.add(drop.mul(0.22)), dark);
      const grain = uv.dot(vec2(12.9898, 78.233)).add(time.fract()).sin().mul(43758.5453).fract().sub(0.5).mul(quality === "high" ? 0.018 : 0.012);
      return vec4(wet.add(grain).clamp(0, 1), 1);
    });

    const pipeline = new THREE.RenderPipeline(gl);
    pipeline.outputNode = grade();
    fx.current = { pipeline, aberration, skyColor, skyAmount, dark, rain };
    return () => {
      pipeline.dispose();
      fx.current = null;
    };
  }, [gl, scene, camera, quality]);

  useFrame((_, delta) => {
    if (!fx.current) return;
    const { pipeline, aberration, skyColor, skyAmount, dark, rain } = fx.current;
    aberration.value = THREE.MathUtils.lerp(aberration.value, 0.04 + sceneState.energy * 0.35, 0.1);
    // Sky and rain follow the mood service (Lagos), easing over a few seconds.
    const isDark = getTheme() === "dark";
    dark.value = isDark ? 1 : 0;
    const { phase } = sceneState.sky;
    if (phase) target.current.setStyle(SKY[isDark ? "dark" : "light"][phase]);
    const k = 1 - Math.exp(-Math.min(delta, 0.5) * 0.8); // time-based: same feel at any frame rate
    skyColor.value.lerp(target.current, k);
    skyAmount.value = THREE.MathUtils.lerp(skyAmount.value, phase ? (isDark ? 0.9 : 0.6) : 0, k);
    rain.value = THREE.MathUtils.lerp(rain.value, sceneState.sky.rain, k);
    pipeline.render();
  }, 1);

  return null;
}
