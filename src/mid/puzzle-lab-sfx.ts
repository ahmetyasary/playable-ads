/**
 * Puzzle Lab SFX — real recorded samples (Mixkit License).
 * Pour: “Pouring water to glass” style recording for vial-to-vial fills.
 */

import { WAV_POUR, WAV_START, WAV_WIN } from "./puzzle-lab-sfx-data";

let ctx: AudioContext | null = null;
let pourMaster: GainNode | null = null;
let pourSrc: AudioBufferSourceNode | null = null;
const cache = new Map<string, AudioBuffer>();

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
  void getBuffer("pour", WAV_POUR);
  return c;
}

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getBuffer(key: string, b64: string): Promise<AudioBuffer> {
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const c = audioCtx();
  const buf = await c.decodeAudioData(b64ToArrayBuffer(b64).slice(0));
  cache.set(key, buf);
  return buf;
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

function playOneshot(key: string, b64: string, gain = 0.7) {
  runWhenReady(() => {
    void getBuffer(key, b64).then((buf) => {
      const c = audioCtx();
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.value = gain;
      src.connect(g);
      g.connect(c.destination);
      src.start(c.currentTime);
    });
  });
}

let startPlayed = false;

export function playStart() {
  runWhenReady(() => {
    if (startPlayed) {
      return;
    }
    startPlayed = true;
    playOneshot("start", WAV_START, 0.5);
  });
}

/** Real liquid pour while filling between vials (play head → fade on stop). */
export function startPourSfx() {
  runWhenReady(() => {
    void (async () => {
      stopPourSfx(true);
      const c = audioCtx();
      const buf = await getBuffer("pour", WAV_POUR);
      const t = c.currentTime;

      const master = c.createGain();
      master.gain.setValueAtTime(0.0001, t);
      master.gain.exponentialRampToValueAtTime(0.9, t + 0.04);
      master.connect(c.destination);
      pourMaster = master;

      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(master);
      src.start(t);
      pourSrc = src;
    })();
  });
}

export function stopPourSfx(immediate = false) {
  if (!ctx) {
    return;
  }
  const c = ctx;
  const t = c.currentTime;
  const master = pourMaster;
  const src = pourSrc;
  pourMaster = null;
  pourSrc = null;
  if (master) {
    master.gain.cancelScheduledValues(t);
    const cur = Math.max(master.gain.value, 0.0001);
    master.gain.setValueAtTime(cur, t);
    master.gain.exponentialRampToValueAtTime(
      0.0001,
      t + (immediate ? 0.05 : 0.18),
    );
  }
  window.setTimeout(
    () => {
      try {
        src?.stop();
      } catch {
        /* already stopped */
      }
    },
    immediate ? 60 : 200,
  );
}

export function playWin() {
  runWhenReady(() => {
    stopPourSfx();
    playOneshot("win", WAV_WIN, 0.55);
  });
}
