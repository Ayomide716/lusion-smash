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
  // Shrink long words (typed names, messages) so they fit the canvas.
  ctx.font = `800 400px ${fontFamily}`;
  const fit = Math.min(1, (w * 0.94) / Math.max(1, ctx.measureText(text).width));
  if (fit < 1) ctx.font = `800 ${Math.floor(400 * fit)}px ${fontFamily}`;
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

/** Any word as a unit-width point cloud (used for hover words and the loader handoff). */
export function textShape(count: number, text: string, fontFamily: string) {
  return initials(count, text, fontFamily, mulberry32(text.length * 7919 + 17));
}

export function buildShapes(count: number, text: string, fontFamily: string) {
  return {
    initials: initials(count, text, fontFamily, mulberry32(1)),
    sphere: sphere(count, mulberry32(2)),
    knot: knot(count, mulberry32(3)),
    galaxy: galaxy(count, mulberry32(4)),
  } satisfies Record<ShapeName, Float32Array>;
}

// --- Project sculptures ------------------------------------------------------
// Shown instead of the spelled title while a project card is hovered (or, on
// phones, crossing the middle of the screen). Same space as `textShape`:
// roughly x ∈ [-0.8, 0.8], y ∈ [-0.55, 0.55], tilted for a 3D read.

type Emit = (x: number, y: number, z: number) => void;

function sculpture(count: number, seed: number, draw: (emit: Emit, rand: () => number, n: number) => void) {
  const rand = mulberry32(seed);
  const out = new Float32Array(count * 4);
  let i = 0;
  const ay = -0.5; // turn and tip it towards the camera
  const ax = 0.28;
  const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
  const emit: Emit = (x, y, z) => {
    if (i >= count) return;
    const x1 = x * cy + z * sy;
    const z1 = z * cy - x * sy;
    const y2 = y * cx - z1 * sx;
    const z2 = z1 * cx + y * sx;
    out[i * 4] = x1;
    out[i * 4 + 1] = y2;
    out[i * 4 + 2] = z2;
    out[i * 4 + 3] = rand();
    i++;
  };
  draw(emit, rand, count);
  while (i < count) emit(gaussian(rand) * 0.6, gaussian(rand) * 0.4, gaussian(rand) * 0.3); // stray dust
  return out;
}

/** Points on the six faces of a box centred at (cx, cy, cz). */
function box(emit: Emit, rand: () => number, n: number, w: number, h: number, d: number, cx = 0, cy = 0, cz = 0) {
  const areas = [w * h, w * h, w * d, w * d, h * d, h * d];
  const total = areas.reduce((a, b) => a + b, 0);
  for (let k = 0; k < n; k++) {
    let r = rand() * total;
    let f = 0;
    while (r > areas[f]) r -= areas[f++];
    const u = rand() - 0.5, v = rand() - 0.5;
    const s = f % 2 ? 0.5 : -0.5;
    if (f < 2) emit(cx + u * w, cy + v * h, cz + s * d);
    else if (f < 4) emit(cx + u * w, cy + s * h, cz + v * d);
    else emit(cx + s * w, cy + u * h, cz + v * d);
  }
}

/** NaijaHustle: a shopping bag with rope handles. */
function bag(count: number) {
  return sculpture(count, 101, (emit, rand, n) => {
    const body = Math.floor(n * 0.78);
    for (let k = 0; k < body; k++) {
      // Slight taper: wider at the top, like a paper bag.
      const t = rand();
      const y = -0.5 + t * 0.78;
      const halfW = 0.36 + t * 0.06;
      const face = rand();
      if (face < 0.42) emit((rand() - 0.5) * 2 * halfW, y, 0.17);
      else if (face < 0.84) emit((rand() - 0.5) * 2 * halfW, y, -0.17);
      else emit(rand() < 0.5 ? -halfW : halfW, y, (rand() - 0.5) * 0.34);
    }
    for (let k = body; k < n * 0.92; k++) {
      const a = rand() * Math.PI;
      const side = rand() < 0.5 ? -0.13 : 0.13;
      emit(Math.cos(a) * 0.2 + gaussian(rand) * 0.008, 0.28 + Math.sin(a) * 0.24, side + gaussian(rand) * 0.008);
    }
  });
}

/** ZWCC: a phone with a screen of app tiles. */
function phone(count: number) {
  return sculpture(count, 202, (emit, rand, n) => {
    const w = 0.5, h = 1.04;
    box(emit, rand, Math.floor(n * 0.4), w, h, 0.07);
    // Screen tiles (a 3×4 grid of app icons) and a header bar.
    const tiles = Math.floor(n * 0.35);
    for (let k = 0; k < tiles; k++) {
      const col = Math.floor(rand() * 3), row = Math.floor(rand() * 4);
      emit(-0.15 + col * 0.15 + (rand() - 0.5) * 0.1, 0.22 - row * 0.17 + (rand() - 0.5) * 0.1, 0.04);
    }
    for (let k = 0; k < n * 0.1; k++) emit((rand() - 0.5) * 0.4, 0.4 + (rand() - 0.5) * 0.05, 0.04);
  });
}

/** Larshaun: a rising bar chart with a trend line. */
function bars(count: number) {
  return sculpture(count, 303, (emit, rand, n) => {
    const heights = [0.32, 0.5, 0.42, 0.7, 0.92];
    const per = Math.floor((n * 0.72) / heights.length);
    heights.forEach((bh, b) => box(emit, rand, per, 0.18, bh, 0.18, -0.56 + b * 0.28, -0.5 + bh / 2, 0));
    for (let k = 0; k < n * 0.08; k++) emit(-0.72 + rand() * 1.44, -0.52, (rand() - 0.5) * 0.24); // axis
    for (let k = 0; k < n * 0.12; k++) {
      // Trend line through the bar tops, lifted above them.
      const t = rand() * (heights.length - 1);
      const i0 = Math.floor(t);
      const f = t - i0;
      const top = heights[i0] + (heights[Math.min(i0 + 1, heights.length - 1)] - heights[i0]) * f;
      emit(-0.56 + t * 0.28, -0.5 + top + 0.1 + gaussian(rand) * 0.006, 0.12);
    }
  });
}

/** Amelia Hart: an open book with lines of text. */
function book(count: number) {
  return sculpture(count, 404, (emit, rand, n) => {
    for (let k = 0; k < n * 0.9; k++) {
      const left = rand() < 0.5;
      const u = rand(); // 0 at the spine, 1 at the page edge
      const v = rand() - 0.5;
      // Text lines: points bunch into rows across most of the page.
      const lined = rand() < 0.6 && u > 0.12 && u < 0.9;
      const y = lined ? Math.round(v * 12) / 12 + gaussian(rand) * 0.006 : v;
      const x = (left ? -1 : 1) * u * 0.74;
      const z = Math.sin(u * Math.PI) * 0.1 - u * 0.12; // pages curl up from the spine
      emit(x, y * 0.95, z);
    }
  });
}

const SCULPTURES: Record<string, (count: number) => Float32Array> = {
  NAIJAHUSTLE: bag,
  "ZWCC BUSINESS GRANT": phone,
  "LARSHAUN PARTY PACKS": bars,
  "AMELIA HART STORY STUDIO": book,
};

/** A project's sculpture for a hover word, if it has one. */
export function sculptureFor(word: string, count: number) {
  return SCULPTURES[word]?.(count) ?? null;
}
