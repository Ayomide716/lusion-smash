import type { Metadata } from "next";
import { LiveStats } from "@/components/LiveStats";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "How this site works",
  description: "The architecture behind this portfolio: WebGPU compute, TSL shaders, Rust/WASM, Go and Python.",
};

const layers = [
  {
    lang: "WGSL via TSL",
    status: "Live",
    role: "GPU simulation",
    body: "Every particle is simulated in a compute shader: spring forces towards the current shape, curl-noise turbulence and cursor swirl. Nothing about particle motion runs on the CPU.",
  },
  {
    lang: "TSL → WGSL / GLSL",
    status: "Live",
    role: "Materials and post-processing",
    body: "The iridescent particle material and the bloom, chromatic aberration, vignette and grain chain are written once in TSL. It compiles to WGSL on WebGPU and GLSL on the WebGL 2 fallback.",
  },
  {
    lang: "TypeScript",
    status: "Live",
    role: "Orchestration",
    body: "Next.js and React Three Fiber. Scroll position and cursor input live in a mutable store read inside the render loop, so moving the mouse never re-renders React.",
  },
  {
    lang: "Tailwind CSS + HTML",
    status: "Live",
    role: "Interface",
    body: "Semantic, server-rendered HTML that works without JavaScript or a GPU. The 3D layer is purely decorative and hidden from assistive technology.",
  },
  {
    lang: "Rust + C++ → WebAssembly",
    status: "Next",
    role: "CPU-side precision work",
    body: "Cursor ray picking and gesture interpretation, compiled to a single WASM module that JavaScript reads through a zero-copy Float32Array view.",
  },
  {
    lang: "Python (FastAPI)",
    status: "Next",
    role: "Mood service",
    body: "Picks the scene's palette and turbulence from real-world signals like the visitor's local time of day.",
  },
  {
    lang: "Go",
    status: "Next",
    role: "Realtime presence",
    body: "A WebSocket hub that shares other visitors' cursors, so you see their ripples in the same particle field.",
  },
];

export default function HowItWorks() {
  return (
    <div className="container-page pt-36 pb-24">
      <section data-shape="galaxy" data-shape-x="0.45" data-shape-scale="0.9">
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-accent uppercase">How this site works</p>
          <h1 className="mt-4 max-w-4xl text-5xl leading-[1] font-semibold tracking-[-0.04em] text-balance md:text-7xl">
            Every language here <span className="font-serif font-normal italic text-fg/80">earns its place.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-fg/70">
            Each layer uses the language best suited to its job, and covers the weaknesses of the others. These numbers
            are live from the particle field behind this page.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10 max-w-3xl">
          <LiveStats />
        </Reveal>
      </section>

      <section data-shape="sphere" data-shape-x="-0.5" data-shape-scale="0.8" className="mt-24" aria-label="Architecture layers">
        <ol className="grid gap-5 md:grid-cols-2">
          {layers.map((l, i) => (
            <li key={l.lang}>
              <Reveal delay={(i % 2) * 0.06} className="glass h-full rounded-3xl p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-xs tracking-widest text-muted uppercase">{l.role}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${
                      l.status === "Live" ? "bg-accent/15 text-accent" : "bg-white/8 text-fg/60"
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight">{l.lang}</h2>
                <p className="mt-3 text-fg/70">{l.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
