# Famoyegun Ayomide — Portfolio

A full-stack product engineer's portfolio with a live GPU particle field behind the content. Particles form
my initials, then morph into a new shape for each section as you scroll, and swirl around the cursor.

## Structure

| Path | What |
|---|---|
| `web/` | Next.js 16 site (TypeScript, Tailwind CSS 4, React Three Fiber, three.js WebGPU + TSL) |
| `.claude/skills/` | Claude Code skills for three.js / WebGPU / TSL work |

Planned: `engine/` (Rust + C++ → WebAssembly), `services/mood` (Python FastAPI), `services/presence` (Go WebSockets).

## How the scene works

- **Simulation** (`web/src/components/scene/simulation.ts`): a TSL compute kernel updates every particle on the GPU —
  a spring towards the current shape, curl-noise turbulence and cursor swirl. Shape targets are stored in float
  textures, so the same kernel runs on WebGPU (as WGSL) and on the WebGL 2 fallback (as GLSL via transform feedback).
- **Shapes** (`shapes.ts`): initials rasterised from the page font, a sphere, a torus knot and a spiral galaxy.
  Any element with `data-shape="…"` (plus optional `data-shape-x`, `data-shape-y`, `data-shape-scale`) drives the morph.
- **Post-processing** (`PostFX.tsx`): bloom → chromatic aberration → vignette + grain, written in TSL.
- **Fallbacks**: WebGPU is probed at start-up and the WebGL 2 backend is used if it's missing or broken. If the GPU
  scene fails entirely, a static gradient remains. Reduced-motion users get a calm version.
- **Budget**: 131k particles on desktop WebGPU, 49k on mobile/low-core devices, 16–32k on WebGL 2.

Debug query params: `?renderer=webgl` forces the WebGL 2 backend, `?fx=0` disables post-processing.

## Develop

```bash
cd web
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
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
