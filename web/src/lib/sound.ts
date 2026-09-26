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

/** A soft, slowly breathing pad: two detuned sines through a low-pass filter. */
function startAmbient() {
  const { ctx, master } = audio();
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 2.5);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  const oscs = [110, 164.81, 220.6].map((f) => {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    o.connect(filter);
    o.start();
    return o;
  });
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 250;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();
  filter.connect(out).connect(master);
  return {
    stop() {
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 0.6);
      [...oscs, lfo].forEach((o) => o.stop(t + 0.7));
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
