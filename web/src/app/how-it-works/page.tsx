import type { Metadata } from "next";
import { ServiceStatus } from "@/components/ServiceStatus";
import { LiveStats } from "@/components/LiveStats";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "How this site works",
  description: "The architecture behind this portfolio: WebGPU compute, TSL shaders, Rust/WASM, Go and Python.",
};

type Layer = { lang: string; status: "Live" | "mood" | "presence"; role: string; body: string };

const layers: Layer[] = [
  {
    lang: "TSL → GLSL / WGSL",
    status: "Live",
    role: "GPU simulation",
    body: "Every particle is simulated in a GPU compute kernel: spring forces towards the current shape, curl-noise turbulence, cursor swirl and the fluid field. It runs as GLSL on WebGL 2 by default and as WGSL on WebGPU (?renderer=webgpu).",
  },
  {
    lang: "TSL → WGSL / GLSL",
    status: "Live",
    role: "Materials and post-processing",
    body: "The pink particle material and the lens-fringe and grain pass are written once in TSL, which compiles to GLSL or WGSL depending on the renderer.",
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
    lang: "C++ → WebAssembly",
    status: "Live",
    role: "Fluid dynamics",
    body: "A stable-fluids Navier–Stokes solver (semi-Lagrangian advection, pressure projection, vorticity confinement) on an 80×80 grid, which also carries the pink ink your cursor leaves behind. Freestanding C++ with no libc or allocation, linked straight into the Rust module.",
  },
  {
    lang: "Rust → WebAssembly",
    status: "Live",
    role: "Engine core",
    body: "Owns the safe boundary around the solver, a critically damped spring that smooths your cursor, a fixed 60 Hz simulation clock, and half-float packing. It also lays other visitors' cursor paths into the same fluid, more gently than yours. The whole engine is one 28 KB module with zero imports; JavaScript reads the flow field through a zero-copy view of its memory and hands it to the GPU as a texture.",
  },
  {
    lang: "Python (FastAPI)",
    status: "mood",
    role: "Mood service",
    body: "Reads the time of day and live weather in Lagos (Open-Meteo, cached so the free API is asked at most every ten minutes) and turns them into scene parameters: warmer pinks at dawn, deeper fuchsia at night, more turbulence when it's windy, a slower, calmer field when it rains, and soft flashes during a storm. The footer shows the weather it's using.",
  },
  {
    lang: "Go",
    status: "presence",
    role: "Realtime presence",
    body: "A WebSocket hub that shares anonymous cursor positions between people here at the same time: theirs appear as faint rings that stir the fluid and ripple the particles, with a live count in the nav. Nothing else is sent (no names, no IPs), connections are rate-limited and capped, and only this site's origins may connect.",
  },
];

export default function HowItWorks() {
  return (
    <div className="container-page pt-36 pb-24">
      <section data-shape="galaxy" data-shape-x="0.45" data-shape-scale="0.9">
        <Reveal>
          <p className="font-mono text-xs tracking-widest text-accent uppercase">How this site works</p>
          <h1 className="mt-4 max-w-4xl text-5xl leading-[1] font-semibold tracking-[-0.04em] text-balance md:text-7xl">
            Every language here <span className="text-accent">earns its place.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-fg/70">
            Each layer uses the language best suited to its job, and covers the weaknesses of the others. These numbers
            are live from the particle field behind this page. Move your cursor to stir the fluid.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10 max-w-5xl">
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
                  {l.status === "Live" ? (
                    <span className="rounded-full bg-accent/15 px-2.5 py-1 font-mono text-[11px] text-accent">Live</span>
                  ) : (
                    <ServiceStatus service={l.status} />
                  )}
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
