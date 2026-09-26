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
    // "playback" asks for larger audio buffers: a little more latency, far fewer
    // underruns (heard as crackle) on phones.
    ctx = new Ctor({ latencyHint: "playback" });
    master = ctx.createGain();
    master.gain.value = 0.8;
    // Gentle limiter so overlapping sounds can never clip.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.005;
    limiter.release.value = 0.25;
    master.connect(limiter).connect(ctx.destination);
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

// Generative ambient: slow, warm sine chords with the occasional pentatonic
// chime, through a light echo "room". Built to be cheap for phones: one fixed
// set of oscillators crossfades between chords (nothing is created or
// destroyed while it plays), and the room is two filtered delay lines rather
// than a convolution reverb.
const CHORDS = [
  [220.0, 261.63, 329.63, 392.0], // Fmaj7 (no root) — A C E G
  [196.0, 246.94, 329.63, 392.0], // C/G — G B E G
  [220.0, 261.63, 329.63, 493.88], // Am9 — A C E B
  [196.0, 293.66, 440.0, 493.88], // Gsus — G D A B
];
const CHIMES = [523.25, 587.33, 659.26, 783.99, 880.0]; // C major pentatonic
const CHORD_SECONDS = 10;
const FADE_SECONDS = 4;
const VOICE_LEVEL = 0.016;

function startAmbient() {
  const { ctx, master } = audio();
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, now);
  out.gain.linearRampToValueAtTime(1, now + 3);
  out.connect(master);

  // Soft top end, then dry + a two-tap filtered feedback echo for space.
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2200;
  tone.Q.value = 0.2;
  tone.connect(out);
  const room = ctx.createGain();
  room.gain.value = 0.3;
  room.connect(out);
  for (const [time, feedback] of [[0.37, 0.42], [0.53, 0.38]]) {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = time;
    const damp = ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 1400;
    const fb = ctx.createGain();
    fb.gain.value = feedback;
    tone.connect(delay);
    delay.connect(damp).connect(fb).connect(delay);
    damp.connect(room);
  }

  // Two banks of four voices; each voice is a sine plus a faint octave sine.
  const oscillators: OscillatorNode[] = [];
  const banks = [0, 1].map(() => {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(tone);
    const voices = [0, 1, 2, 3].map(() => {
      const pair = [1, 2].map((mult) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        const g = ctx.createGain();
        g.gain.value = mult === 1 ? VOICE_LEVEL : VOICE_LEVEL * 0.12;
        o.connect(g).connect(gain);
        o.start(now);
        oscillators.push(o);
        return { o, mult };
      });
      return pair;
    });
    return { gain, voices };
  });

  const timers: number[] = [];
  let index = 0;
  let active = 0;

  // Retune the silent bank to the next chord, then crossfade to it.
  const next = () => {
    const t = ctx.currentTime;
    const incoming = banks[active];
    const outgoing = banks[1 - active];
    CHORDS[index % CHORDS.length].forEach((f, v) => {
      for (const { o, mult } of incoming.voices[v]) o.frequency.setValueAtTime(f * mult, t);
    });
    incoming.gain.gain.cancelScheduledValues(t);
    incoming.gain.gain.setValueAtTime(incoming.gain.gain.value, t);
    incoming.gain.gain.linearRampToValueAtTime(1, t + FADE_SECONDS);
    outgoing.gain.gain.cancelScheduledValues(t);
    outgoing.gain.gain.setValueAtTime(outgoing.gain.gain.value, t);
    outgoing.gain.gain.linearRampToValueAtTime(0, t + FADE_SECONDS);
    index++;
    active = 1 - active;
    timers.push(window.setTimeout(next, CHORD_SECONDS * 1000));
  };

  /** A soft bell: sine with a faint octave, quick attack, long exponential tail. */
  const chime = () => {
    const t = ctx.currentTime;
    const f = CHIMES[Math.floor(Math.random() * CHIMES.length)];
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.012, t + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    env.connect(tone);
    for (const [mult, level] of [[1, 1], [2, 0.2]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(env);
      o.start(t);
      o.stop(t + 3.1);
    }
    timers.push(window.setTimeout(chime, 3000 + Math.random() * 5000));
  };

  next();
  timers.push(window.setTimeout(chime, 4500));

  return {
    stop() {
      timers.forEach((id) => window.clearTimeout(id));
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 1.2);
      oscillators.forEach((o) => o.stop(t + 1.3));
      window.setTimeout(() => out.disconnect(), 1600);
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
