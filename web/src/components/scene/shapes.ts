// Target point clouds the particles morph between. Every shape lives in a
// roughly unit-sized space centred on the origin and is packed as vec4
// (xyz + a per-point weight in w) to match GPU storage alignment.

export const SHAPES = ["initials", "sphere", "knot", "galaxy"] as const;
export type ShapeName = (typeof SHAPES)[number];

const TAU = Math.PI * 2;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  return Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(TAU * rand());
}

/** Rasterise text with the page font and scatter points over the filled pixels. */
function initials(count: number, text: string, fontFamily: string, rand: () => number) {
  const out = new Float32Array(count * 4);
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return sphere(count, rand);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 400px ${fontFamily}`;
  ctx.fillText(text, w / 2, h / 2 + 16);

  const data = ctx.getImageData(0, 0, w, h).data;
  const filled: number[] = [];
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (data[(y * w + x) * 4 + 3] > 128) filled.push(x, y);
    }
  }
  if (filled.length === 0) return sphere(count, rand);

  // Normalise to the glyphs' bounding box so the word spans x ∈ [-1, 1].
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < filled.length; i += 2) {
    minX = Math.min(minX, filled[i]);
    maxX = Math.max(maxX, filled[i]);
    minY = Math.min(minY, filled[i + 1]);
    maxY = Math.max(maxY, filled[i + 1]);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = 2 / Math.max(1, maxX - minX);

  const pixels = filled.length / 2;
  for (let i = 0; i < count; i++) {
    const p = Math.floor(rand() * pixels) * 2;
    out[i * 4 + 0] = (filled[p] + (rand() - 0.5) * 2 - cx) * scale;
    out[i * 4 + 1] = -(filled[p + 1] + (rand() - 0.5) * 2 - cy) * scale;
    out[i * 4 + 2] = gaussian(rand) * 0.05;
    out[i * 4 + 3] = rand();
  }
  return out;
}

/** Fibonacci shell with a soft inner volume. */
function sphere(count: number, rand: () => number) {
  const out = new Float32Array(count * 4);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const shell = rand() < 0.9;
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const radius = shell ? 0.9 + gaussian(rand) * 0.012 : Math.cbrt(rand()) * 0.85;
    out[i * 4 + 0] = Math.cos(theta) * r * radius;
    out[i * 4 + 1] = y * radius;
    out[i * 4 + 2] = Math.sin(theta) * r * radius;
    out[i * 4 + 3] = rand();
  }
  return out;
}

/** (2,3) torus knot swept with a gaussian tube. */
function knot(count: number, rand: () => number) {
  const out = new Float32Array(count * 4);
  const p = 2;
  const q = 3;
  for (let i = 0; i < count; i++) {
    const t = rand() * TAU;
    const r = 0.52 + 0.24 * Math.cos(q * t);
    const cx = r * Math.cos(p * t);
    const cy = r * Math.sin(p * t);
    const cz = 0.24 * Math.sin(q * t);
    const tube = 0.075 * Math.abs(gaussian(rand)) ** 0.7;
    const a = rand() * TAU;
    out[i * 4 + 0] = cx + Math.cos(a) * tube;
    out[i * 4 + 1] = cy + Math.sin(a) * tube;
    out[i * 4 + 2] = cz + Math.sin(a + 1.3) * tube;
    out[i * 4 + 3] = rand();
  }
  return out;
}

/** Three-armed spiral disc, tilted towards the camera. */
function galaxy(count: number, rand: () => number) {
  const out = new Float32Array(count * 4);
  const arms = 3;
  const tilt = 1.1;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  for (let i = 0; i < count; i++) {
    const radius = Math.pow(rand(), 1.6) * 1.15;
    const arm = (Math.floor(rand() * arms) / arms) * TAU;
    const spin = radius * 4.2;
    const spread = 0.09 + radius * 0.12;
    const angle = arm + spin;
    const x = Math.cos(angle) * radius + gaussian(rand) * spread;
    const z = Math.sin(angle) * radius + gaussian(rand) * spread;
    const y = gaussian(rand) * 0.035 * (1.2 - radius);
    out[i * 4 + 0] = x;
    out[i * 4 + 1] = y * cosT - z * sinT;
    out[i * 4 + 2] = y * sinT + z * cosT;
    out[i * 4 + 3] = rand();
  }
  return out;
}

export function buildShapes(count: number, text: string, fontFamily: string) {
  return {
    initials: initials(count, text, fontFamily, mulberry32(1)),
    sphere: sphere(count, mulberry32(2)),
    knot: knot(count, mulberry32(3)),
    galaxy: galaxy(count, mulberry32(4)),
  } satisfies Record<ShapeName, Float32Array>;
}
