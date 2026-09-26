// UI sound design, synthesised with Web Audio (no audio files to download).
// Off by default. Nothing plays until the visitor turns it on, which also
// satisfies browsers' autoplay rules.

type Listener = () => void;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambient: { stop: () => void } | null = null;
let enabled = false;
const listeners = new Set<Listener>();

export function isSoundOn() {
  return enabled;
}

export function subscribeSound(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  return { ctx, master: master! };
}

/** A short enveloped tone; `to` glides the pitch. */
function blip(freq: number, to: number, length: number, volume: number, type: OscillatorType = "sine") {
  if (!enabled) return;
  const { ctx, master } = audio();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

let lastHover = 0;
export function playHover() {
  const now = performance.now();
  if (now - lastHover < 60) return;
  lastHover = now;
  blip(2200, 1800, 0.05, 0.025);
}

export function playClick() {
  blip(520, 260, 0.12, 0.06, "triangle");
}

// Generative ambient: slow warm chords with a soft chorus, the occasional
// pentatonic chime, all through a synthesised reverb. No low drone and no
// filter wobble, so it reads as calm music rather than a hum.
const CHORDS = [
  [220.0, 261.63, 329.63, 392.0], // Fmaj7 (no root) — A C E G
  [196.0, 246.94, 329.63, 392.0], // C/G — G B E G
  [220.0, 261.63, 329.63, 493.88], // Am9 — A C E B
  [196.0, 293.66, 440.0, 493.88], // Gsus — G D A B
];
const CHIMES = [523.25, 587.33, 659.26, 783.99, 880.0]; // C major pentatonic
const CHORD_SECONDS = 10;

/** A few seconds of decaying stereo noise: a cheap, lush reverb impulse. */
function impulse(ctx: AudioContext, seconds = 4.5) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  return buffer;
}

function startAmbient() {
  const { ctx, master } = audio();
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
  out.connect(master);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  reverb.connect(wet).connect(out);
  const dry = ctx.createGain();
  dry.gain.value = 0.45;
  dry.connect(out);

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 1800;
  tone.Q.value = 0.3;
  tone.connect(dry);
  tone.connect(reverb);

  const voices: OscillatorNode[] = [];
  const timers: number[] = [];

  /** One chord: each note is a sine plus a quieter triangle a hair apart, faded in and out. */
  const playChord = (notes: number[], at: number) => {
    const attack = 3.5;
    const hold = CHORD_SECONDS - 1;
    const release = 5;
    for (const f of notes) {
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, at);
      env.gain.linearRampToValueAtTime(0.018, at + attack);
      env.gain.setValueAtTime(0.018, at + hold);
      env.gain.linearRampToValueAtTime(0, at + hold + release);
      env.connect(tone);
      for (const [type, detune, level] of [["sine", -2, 1], ["triangle", 2, 0.35]] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = level;
        o.connect(g).connect(env);
        o.start(at);
        o.stop(at + hold + release + 0.1);
        voices.push(o);
        o.onended = () => voices.splice(voices.indexOf(o), 1);
      }
    }
  };

  /** A soft bell: sine with a faint octave, quick attack, long exponential tail. */
  const chime = () => {
    const t = ctx.currentTime;
    const f = CHIMES[Math.floor(Math.random() * CHIMES.length)];
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.014, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    env.connect(reverb);
    env.connect(dry);
    for (const [mult, level] of [[1, 1], [2, 0.25]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(env);
      o.start(t);
      o.stop(t + 3.6);
    }
    timers.push(window.setTimeout(chime, 2500 + Math.random() * 4500));
  };

  let index = 0;
  const next = () => {
    playChord(CHORDS[index % CHORDS.length], ctx.currentTime + 0.05);
    index++;
    timers.push(window.setTimeout(next, CHORD_SECONDS * 1000));
  };
  next();
  timers.push(window.setTimeout(chime, 4000));

  return {
    stop() {
      timers.forEach((id) => window.clearTimeout(id));
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 1.2);
      [...voices].forEach((o) => {
        try {
          o.stop(t + 1.3);
        } catch {}
      });
      window.setTimeout(() => out.disconnect(), 1500);
    },
  };
}

export function setSound(on: boolean) {
  enabled = on;
  if (on) {
    const { ctx } = audio();
    void ctx.resume();
    ambient ??= startAmbient();
    blip(660, 990, 0.18, 0.05);
  } else {
    ambient?.stop();
    ambient = null;
  }
  listeners.forEach((l) => l());
}
