# Famoyegun Ayomide — Portfolio

A full-stack product engineer's portfolio: a white, pink-accented site with a live GPU particle field behind the content. Particles form
my initials, then morph into a new shape for each section as you scroll, and swirl around the cursor.

## Structure

| Path | What |
|---|---|
| `web/` | Next.js 16 site (TypeScript, Tailwind CSS 4, React Three Fiber, three.js WebGPU + TSL) |
| `engine/` | Rust + C++ → one WebAssembly module: cursor dynamics and a Navier–Stokes fluid solver |
| `.claude/skills/` | Claude Code skills for three.js / WebGPU / TSL work |

Planned: `services/mood` (Python FastAPI), `services/presence` (Go WebSockets).

## How the scene works

- **Simulation** (`web/src/components/scene/simulation.ts`): a TSL compute kernel updates every particle on the GPU —
  a spring towards the current shape, curl-noise turbulence and cursor swirl. Shape targets are stored in float
  textures, so the same kernel runs on WebGPU (as WGSL) and on the WebGL 2 fallback (as GLSL via transform feedback).
- **Shapes** (`shapes.ts`): initials rasterised from the page font, a sphere, a torus knot and a spiral galaxy.
  Any element with `data-shape="…"` (plus optional `data-shape-x`, `data-shape-y`, `data-shape-scale`) drives the morph.
- **Fluid** (`engine/`): a stable-fluids solver in freestanding C++ (advection, pressure projection with
  warm-started SOR, vorticity confinement) linked into a Rust crate that smooths the cursor with a critically
  damped spring, runs a fixed 60 Hz clock and packs the velocity field into half floats. The 26 KB `.wasm` has no
  imports and no JS glue; `web/src/lib/engine.ts` reads the field through a zero-copy view of wasm memory and the
  compute kernel samples it as a texture, so particles are carried by the flow behind your cursor.
- **Post-processing** (`PostFX.tsx`): bloom → chromatic aberration → vignette + grain, written in TSL.
- **Renderers & fallbacks**: WebGL 2 is the default; WebGPU is opt-in with `?renderer=webgpu` (it falls back to
  WebGL 2 if it fails to start, loses its device or reports a validation error). Software rasterisers and devices
  that can't hold 20 fps get an animated CSS backdrop instead of a frozen scene. If the `.wasm` can't load, particles
  still run without the fluid. Reduced-motion users get a calmer version.
- **Budget**: WebGL 2 — 65k particles on desktop, 24k on mobile/low-core; WebGPU — 131k / 49k.

Debug query params: `?renderer=webgl|webgpu` picks a backend (and disables the slow-device watchdog), `?fx=0` disables post-processing.

2D motion (`web/src/components/motion/`): custom cursor with contextual labels, magnetic CTAs, masked split-text
headlines, a scroll-velocity marquee, a statement that lights up word by word, count-up metrics, tilt + spotlight
project cards, a scroll-drawn timeline, a scroll progress bar, rolling nav links, a pink route-transition wipe and a
letter-by-letter footer wordmark. Everything is transform/opacity only and switches off under reduced motion.

Design system: generated with the ui-ux-pro-max skill (`.claude/skills/ui-ux-pro-max`) — creative-pink-on-neutral palette,
Space Grotesk + Archivo, glass nav, parallax that switches off under reduced motion.

## Develop

```bash
cd web
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
```

## Rebuild the engine

The compiled module is committed at `web/public/engine/lusion_engine.wasm`, so deploys don't need Rust. After
changing anything in `engine/`:

```bash
rustup target add wasm32-unknown-unknown   # once; also needs clang for the C++ half
./engine/build.sh                          # runs tests, builds, copies the .wasm into web/public
cargo run --release --example bench --manifest-path engine/Cargo.toml
```

## Environment variables (all optional)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata, sitemap and OG image |
| `RESEND_API_KEY` | Enables contact-form email via [Resend](https://resend.com); without it messages are logged |
| `CONTACT_TO_EMAIL` | Where contact messages go (defaults to the email in `site.ts`) |
| `CONTACT_FROM_EMAIL` | Verified sender address in Resend |

## Deploy (Vercel, free Hobby plan)

Import the repo on Vercel, set **Root Directory** to `web`, add the environment variables above and deploy.

## Before publishing

All content except the name is placeholder — edit `web/src/content/site.ts` (projects, experience, email, links).
