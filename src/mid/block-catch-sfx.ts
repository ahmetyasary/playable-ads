/**
 * Block Catch SFX — lightweight Web Audio beeps (no external samples).
 */

let ctx: AudioContext | null = null;
let startPlayed = false;

function audioCtx(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

export function unlockSfx() {
  const c = audioCtx();
  if (c.state === "suspended") {
    void c.resume();
  }
  return c;
}

function runWhenReady(fn: () => void) {
  const c = unlockSfx();
  if (c.state === "running") {
    fn();
    return;
  }
  void c.resume().then(() => {
    if (c.state === "running") {
      fn();
    }
  });
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  when = 0,
) {
  const c = audioCtx();
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur: number, gain: number, when = 0) {
  const c = audioCtx();
  const t0 = c.currentTime + when;
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export function playStart() {
  runWhenReady(() => {
    if (startPlayed) {
      return;
    }
    startPlayed = true;
    tone(392, 0.18, "triangle", 0.12, 0);
    tone(523.25, 0.22, "triangle", 0.14, 0.1);
    tone(659.25, 0.28, "triangle", 0.16, 0.2);
  });
}

export function playPickup() {
  runWhenReady(() => {
    tone(740, 0.08, "square", 0.08);
    tone(880, 0.1, "sine", 0.1, 0.04);
  });
}

export function playPlace() {
  runWhenReady(() => {
    noiseBurst(0.06, 0.18);
    tone(220, 0.12, "triangle", 0.16);
    tone(330, 0.1, "sine", 0.1, 0.03);
  });
}

export function playInvalid() {
  runWhenReady(() => {
    tone(180, 0.1, "sawtooth", 0.08);
    tone(140, 0.14, "sawtooth", 0.07, 0.06);
  });
}

export function playClear(lines: number) {
  runWhenReady(() => {
    const n = Math.min(4, Math.max(1, lines));
    for (let i = 0; i < n; i++) {
      tone(523.25 + i * 120, 0.16, "triangle", 0.14, i * 0.05);
    }
    noiseBurst(0.12, 0.12, 0.02);
  });
}

export function playWin() {
  runWhenReady(() => {
    tone(523.25, 0.22, "triangle", 0.16, 0);
    tone(659.25, 0.24, "triangle", 0.18, 0.12);
    tone(783.99, 0.28, "triangle", 0.2, 0.24);
    tone(1046.5, 0.4, "sine", 0.22, 0.38);
  });
}
