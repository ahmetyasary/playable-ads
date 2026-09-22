import math
import struct
import wave
import base64
from pathlib import Path

out = Path(__file__).resolve().parent / "sfx-wav"
out.mkdir(parents=True, exist_ok=True)
SR = 22050


def clamp(x: float) -> float:
    return max(-1.0, min(1.0, x))


def write_wav(path: Path, samples: list[float]) -> None:
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b"".join(
            struct.pack("<h", int(clamp(s) * 32767)) for s in samples
        )
        w.writeframes(frames)


def pinkish(n: int, seed: int = 1) -> list[float]:
    import random

    rng = random.Random(seed)
    b0 = b1 = b2 = 0.0
    out_s: list[float] = []
    for _ in range(n):
        w = rng.uniform(-1, 1)
        b0 = 0.997 * b0 + w * 0.029
        b1 = 0.985 * b1 + w * 0.12
        b2 = 0.95 * b2 + w * 0.35
        out_s.append(b0 + b1 * 0.5 + b2 * 0.25)
    m = max(abs(x) for x in out_s) or 1
    return [x / m for x in out_s]


def lowpass(xs: list[float], cutoff: float = 0.08) -> list[float]:
    y = 0.0
    out_s: list[float] = []
    for x in xs:
        y += cutoff * (x - y)
        out_s.append(y)
    return out_s


def envelope(n: int, attack: float, release: float) -> list[float]:
    env: list[float] = []
    for i in range(n):
        t = i / n
        if t < attack:
            e = t / attack
        elif t > 1 - release:
            e = (1 - t) / release
        else:
            e = 1.0
        env.append(e * e)
    return env


def note(freq: float, dur: float, vol: float = 0.35) -> list[float]:
    nn = int(SR * dur)
    out_s: list[float] = []
    for i in range(nn):
        t = i / SR
        e = math.exp(-t * 3.2)
        s = math.sin(2 * math.pi * freq * t)
        s += 0.25 * math.sin(2 * math.pi * freq * 2 * t)
        out_s.append(s * e * vol)
    return out_s


# pour loop ~0.9s
n = int(SR * 0.9)
noise = lowpass(pinkish(n, seed=7), 0.12)
flow: list[float] = []
for i, x in enumerate(noise):
    t = i / SR
    mod = 0.72 + 0.28 * math.sin(t * 11.0) * math.sin(t * 3.7 + 1.2)
    bub = 0.0
    for k in range(6):
        center = (0.12 + k * 0.13) * n
        d = (i - center) / (SR * 0.035)
        bub += math.exp(-d * d) * (
            0.35 + 0.15 * math.sin(t * (900 + k * 140))
        )
    flow.append(x * 0.55 * mod + bub * 0.18)
m = max(abs(x) for x in flow) or 1
flow = [x / m * 0.5 for x in flow]
fade = int(SR * 0.06)
for i in range(fade):
    a = i / fade
    flow[i] = flow[i] * a + flow[-fade + i] * (1 - a)
    flow[-fade + i] = flow[i]
write_wav(out / "pour-loop.wav", flow)

# splash
ns = int(SR * 0.28)
splash_n = lowpass(pinkish(ns, seed=3), 0.2)
env = envelope(ns, 0.08, 0.55)
splash: list[float] = []
for i, x in enumerate(splash_n):
    t = i / SR
    click = math.exp(-t * 28) * math.sin(2 * math.pi * 520 * t) * 0.35
    splash.append((x * 0.7 + click) * env[i] * 0.65)
write_wav(out / "pour-splash.wav", splash)

# start
start = [0.0] * int(SR * 0.85)
for freq, delay, vol in [
    (523.25, 0.0, 0.28),
    (659.25, 0.1, 0.3),
    (783.99, 0.22, 0.32),
]:
    nte = note(freq, 0.55, vol)
    off = int(delay * SR)
    for i, v in enumerate(nte):
        if off + i < len(start):
            start[off + i] += v
m = max(abs(x) for x in start) or 1
write_wav(out / "start.wav", [x / m * 0.42 for x in start])

# win
win = [0.0] * int(SR * 1.2)
for freq, delay, vol in [
    (523.25, 0.0, 0.28),
    (659.25, 0.12, 0.3),
    (783.99, 0.24, 0.32),
    (1046.5, 0.38, 0.38),
]:
    nte = note(freq, 0.7, vol)
    off = int(delay * SR)
    for i, v in enumerate(nte):
        if off + i < len(win):
            win[off + i] += v
m = max(abs(x) for x in win) or 1
write_wav(out / "win.wav", [x / m * 0.48 for x in win])

# emit TS module with base64
parts = []
for name in ("pour-loop", "pour-splash", "start", "win"):
    raw = (out / f"{name}.wav").read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    key = name.replace("-", "_").upper()
    parts.append(f'export const WAV_{key} = "{b64}";')
    print(name, len(raw))

(out.parent / "puzzle-lab-sfx-data.ts").write_text("\n".join(parts) + "\n")
print("wrote puzzle-lab-sfx-data.ts")
