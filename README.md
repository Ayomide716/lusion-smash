# Famoyegun Ayomide — Portfolio

A full-stack product engineer's portfolio: a white, pink-accented site with a live GPU particle field behind the content. Particles form
my initials, then morph into a new shape for each section as you scroll, and swirl around the cursor.

## Structure

| Path | What |
|---|---|
| `web/` | Next.js 16 site (TypeScript, Tailwind CSS 4, React Three Fiber, three.js WebGPU + TSL) |
| `engine/` | Rust + C++ → one WebAssembly module: cursor dynamics and a Navier–Stokes fluid solver |
| `services/mood/` | Python (FastAPI): Lagos time of day + live weather → scene palette and turbulence |
| `services/presence/` | Go WebSocket hub: other visitors' cursors and a live "here now" count |
| `render.yaml` | Render Blueprint that deploys both services on the free plan |
| `.claude/skills/` | Claude Code skills for three.js / WebGPU / TSL work |

## How the scene works

- **Simulation** (`web/src/components/scene/simulation.ts`): a TSL compute kernel updates every particle on the GPU —
  a spring towards the current shape, curl-noise turbulence and cursor swirl. Shape targets are stored in float
  textures, so the same kernel runs on WebGPU (as WGSL) and on the WebGL 2 fallback (as GLSL via transform feedback).
- **Shapes** (`shapes.ts`): initials rasterised from the page font, a sphere, a torus knot and a spiral galaxy.
  Any element with `data-shape="…"` (plus optional `data-shape-x`, `data-shape-y`, `data-shape-scale`) drives the morph.
- **Fluid** (`engine/`): a stable-fluids solver in freestanding C++ (advection, pressure projection with
  warm-started SOR, vorticity confinement) linked into a Rust crate that smooths the cursor with a critically
  damped spring, runs a fixed 60 Hz clock and packs the velocity field into half floats. The 28 KB `.wasm` has no
  imports and no JS glue; `web/src/lib/engine.ts` reads the field through a zero-copy view of wasm memory and the
  compute kernel samples it as a texture, so particles are carried by the flow behind your cursor.
- **Post-processing** (`PostFX.tsx`): a light chromatic aberration that swells with cursor energy, plus film grain,
  written in TSL.
- **Renderers & fallbacks**: WebGL 2 is the default; WebGPU is opt-in with `?renderer=webgpu` (it falls back to
  WebGL 2 if it fails to start, loses its device or reports a validation error). Software rasterisers and devices
  that can't hold 20 fps get an animated CSS backdrop instead of a frozen scene. If the `.wasm` can't load, particles
  still run without the fluid. Reduced-motion users get a calmer version.
- **Budget**: WebGL 2 — 65k particles on desktop, 24k on mobile/low-core; WebGPU — 131k / 49k.

Debug query params: `?renderer=webgl|webgpu` picks a backend (and disables the slow-device watchdog), `?fx=0` disables post-processing.

2D motion (`web/src/components/motion/`): custom cursor with contextual labels, magnetic CTAs, masked split-text
headlines, a scroll-velocity marquee, a statement that lights up word by word, count-up metrics, tilt + spotlight
project cards, a scroll-drawn timeline, a scroll progress bar, rolling nav links, a pink route-transition wipe and a
letter-by-letter footer wordmark. Set pieces: a 0→100 loading counter, a pinned horizontal Work gallery, stacking
principle cards, a scroll-driven pink circle reveal for Contact, scrambling section labels, a full-screen mobile menu
and optional synthesised UI sound (Web Audio, off by default): click/hover blips plus a generative ambient of slow
sine chords and pentatonic chimes through a light echo room — a fixed set of crossfading oscillators, large audio
buffers and a limiter keep it crackle-free on phones. A light/dark toggle wipes the new theme in as a circle from
the click point (View Transitions API) and is applied before first paint from `localStorage`; the particles switch to
additive glow on dark. Hero letters thin out under the cursor (variable font axis), and clicks send a shockwave ring
through the particle field. The particles spell whatever you hover (nav links, project names; on phones, the
project crossing the middle of the screen), sway with phone tilt, and the fluid's dye field is drawn as a soft ink
trail behind the cursor. Everything is transform/opacity/clip-path only and
switches off under reduced motion.

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

## Live services (optional)

Both are optional: without their URLs, or while a free server is waking up, the site keeps its default look
and nothing errors.

- **Mood** (`services/mood`, Python/FastAPI): `GET /mood` returns Lagos's phase of day (dawn/day/dusk/night,
  from the real sunrise and sunset), the current weather from [Open-Meteo](https://open-meteo.com) (free, no key;
  cached for 10 minutes, stale copy served if it's down) and bounded scene parameters. The site eases into a
  time-of-day tint, more turbulence when it's windy, a calmer field in rain and soft flashes in a storm, and the
  footer shows the weather.
- **Presence** (`services/presence`, Go): `GET /ws` WebSocket. Clients send only their cursor in viewport
  coordinates; the server broadcasts at 10 Hz (only when something changed) the count and up to 12 other cursors,
  with random per-connection ids. Other visitors appear as faint rings, and the WebAssembly engine's
  `engine_stir` lays their paths into the fluid, so they ripple the particles and ink. Limits: 128-byte messages,
  20 updates/s per connection (flooders are disconnected), `MAX_CLIENTS` connections, and only `ALLOWED_ORIGINS`
  may connect from a browser.

Run and test locally:

```bash
cd services/mood && uv venv && uv pip install -r requirements-dev.txt && .venv/bin/pytest
.venv/bin/uvicorn app.main:app --port 8001

cd services/presence && go test -race ./...
PORT=8002 ALLOWED_ORIGINS=localhost:3000 go run .

# then, in web/: NEXT_PUBLIC_MOOD_URL=http://localhost:8001 NEXT_PUBLIC_PRESENCE_URL=http://localhost:8002 npm run dev
```

Deploy: on [render.com](https://render.com) choose **New → Blueprint**, pick this repo and **Apply** (enter your
site's domain for `ALLOWED_ORIGINS`, e.g. `your-site.vercel.app`). Then add the two service URLs to Vercel as
`NEXT_PUBLIC_MOOD_URL` and `NEXT_PUBLIC_PRESENCE_URL` and redeploy.

## Environment variables (all optional)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata, sitemap and share images (on Vercel it defaults to the project's production URL; set it for a custom domain) |
| `RESEND_API_KEY` | Enables contact-form email via [Resend](https://resend.com); without it messages are logged |
| `CONTACT_TO_EMAIL` | Where contact messages go (defaults to the email in `site.ts`) |
| `CONTACT_FROM_EMAIL` | Verified sender address in Resend |
| `NEXT_PUBLIC_MOOD_URL` | Mood service base URL, e.g. `https://ayomide-mood.onrender.com` |
| `NEXT_PUBLIC_PRESENCE_URL` | Presence service base URL, e.g. `https://ayomide-presence.onrender.com` |

## Deploy (Vercel, free Hobby plan)

Import the repo on Vercel, set **Root Directory** to `web`, add the environment variables above and deploy.
To see visitor numbers, open the project's **Analytics** tab on Vercel and enable Web Analytics (the `<Analytics />`
component is already in the layout).

SEO: the layout carries Person / ProfessionalService / WebSite structured data, each case study has CreativeWork
data, and every case study gets its own share image (`app/work/[slug]/opengraph-image.tsx`) with its screenshot.

## Content

Everything lives in `web/src/content/site.ts`: projects, services, the working process, experience and links.
