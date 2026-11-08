"""Render a Hearthwild score (doctrine AUD-5) to WAV and print a validation/analysis report.

    uv run --project art/source/forge python art/source/audio/tools/render_score.py art/source/audio/scores/<name>.json [--out file.wav] [--loops 2]
Previews default to art/source/forge/work/audio/ (gitignored scratch).

Score notation per track: space-separated tokens, bars split by '|':
  D5:1       note D5 for 1 beat          r:2          rest 2 beats
  D4+F#4+A4:2  chord                     k:1 s:0.5 h:0.5   drum hits (kick/snare/hat) on noise tracks
Every bar must sum to the time signature's beats; the report fails the score otherwise.
Instrument palette (AUD-1): pulse12, pulse25, pulse50, triangle, noise, harp, strings, bell, flute.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
NOTE = re.compile(r"^([A-G])(#|b)?(-?\d)$")
SEMI = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(name: str) -> int:
    m = NOTE.match(name)
    if not m:
        raise ValueError(f"bad note '{name}'")
    base, acc, octv = m.groups()
    return 12 * (int(octv) + 1) + SEMI[base] + (1 if acc == "#" else -1 if acc == "b" else 0)


def hz(m: int) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.full(n, s)
    e[: min(a, n)] = np.linspace(0, 1, min(a, n), endpoint=False)
    if a < n:
        k = min(d, n - a)
        e[a:a + k] = np.linspace(1, s, k, endpoint=False)
    if r:
        k = min(r, n)
        e[n - k:] *= np.linspace(1, 0, k)
    return e


def voice(inst: str, f: float, n: int, rng: np.random.Generator) -> np.ndarray:
    t = np.arange(n) / SR
    ph = (f * t) % 1.0
    if inst.startswith("pulse"):
        duty = {"pulse12": 0.125, "pulse25": 0.25, "pulse50": 0.5}[inst]
        return np.where(ph < duty, 0.6, -0.6) * env(n, 0.005, 0.08, 0.7, 0.04)
    if inst == "triangle":
        return (4 * np.abs(ph - 0.5) - 1) * 0.8 * env(n, 0.005, 0.02, 0.9, 0.03)
    if inst == "harp":
        tone = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 for k in range(1, 6))
        return tone * 0.5 * np.exp(-t * 3.2) * env(n, 0.002, 0.0, 1.0, 0.05)
    if inst == "strings":
        saw = sum(np.sin(2 * np.pi * f * k * t * (1 + 0.003 * np.sin(2 * np.pi * 5 * t))) / k for k in range(1, 8))
        return saw * 0.22 * env(n, 0.25, 0.2, 0.8, 0.3)
    if inst == "bell":
        mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.0 * np.exp(-t * 2)
        return np.sin(2 * np.pi * f * t + mod) * 0.4 * np.exp(-t * 1.6)
    if inst == "flute":
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t)
        tone = np.sin(2 * np.pi * f * t * vib) + 0.2 * np.sin(4 * np.pi * f * t * vib)
        return (tone + 0.03 * rng.standard_normal(n)) * 0.45 * env(n, 0.06, 0.1, 0.85, 0.08)
    raise ValueError(f"unknown instrument '{inst}'")


def drum(kind: str, n: int, rng: np.random.Generator) -> np.ndarray:
    t = np.arange(n) / SR
    if kind == "k":
        f = 110 * np.exp(-t * 18) + 40
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.9
    if kind == "s":
        return (rng.standard_normal(n) * 0.5 + np.sin(2 * np.pi * 190 * t) * 0.3) * np.exp(-t * 16)
    if kind == "h":
        x = rng.standard_normal(n)
        return np.diff(np.concatenate([[0], x])) * 0.25 * np.exp(-t * 45)
    raise ValueError(f"unknown drum '{kind}'")


def parse(track: dict, beats_per_bar: float) -> tuple[list, list[str]]:
    events, errors, pos = [], [], 0.0
    for b, bar in enumerate(track["notes"].split("|"), 1):
        start = pos
        for tok in bar.split():
            sym, _, dur = tok.partition(":")
            d = float(dur)
            if sym != "r":
                events.append((pos, d, sym))
            pos += d
        if bar.strip() and abs((pos - start) - beats_per_bar) > 1e-6:
            errors.append(f"track '{track['name']}' bar {b} has {pos - start:g} beats (expected {beats_per_bar:g})")
    return events, errors


def render(score: dict, loops: int) -> tuple[np.ndarray, dict]:
    rng = np.random.default_rng(1234)
    beat = 60.0 / score["bpm"]
    bpb = score["timeSig"][0] * 4 / score["timeSig"][1]
    parsed, errors, length = [], [], 0.0
    for tr in score["tracks"]:
        ev, er = parse(tr, bpb)
        errors += er
        parsed.append((tr, ev))
        length = max(length, max((p + d for p, d, _ in ev), default=0))
    bars = round(length / bpb)
    total = int((length * loops) * beat * SR) + SR
    mix = np.zeros(total)
    report = {"title": score["title"], "bpm": score["bpm"], "bars": bars, "seconds": round(length * beat, 1),
              "tracks": {}, "errors": errors}
    for tr, ev in parsed:
        buf = np.zeros(total)
        notes = []
        for loop in range(loops):
            off = loop * length
            for p, d, sym in ev:
                n = int(d * beat * SR)
                i0 = int((p + off) * beat * SR)
                if tr["instrument"] == "noise":
                    for k in sym.split("+"):
                        buf[i0:i0 + n] += drum(k, n, rng)[: total - i0]
                    continue
                for nm in sym.split("+"):
                    m = midi(nm)
                    notes.append(m)
                    seg = voice(tr["instrument"], hz(m), n, rng)
                    buf[i0:i0 + n] += seg[: total - i0]
        mix += buf * tr.get("volume", 0.5)
        if notes:
            seq = notes[: len(notes) // loops]
            report["tracks"][tr["name"]] = {
                "instrument": tr["instrument"], "stem": tr.get("stem"), "notes": len(seq),
                "range": [min(seq), max(seq)], "rangeSemitones": max(seq) - min(seq),
                "distinctPitches": len(set(seq)), "notesPerBar": round(len(seq) / max(bars, 1), 2)}
    peak = np.max(np.abs(mix)) or 1.0
    return (mix / peak * 0.85), report


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("score", type=Path)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--loops", type=int, default=2)
    a = ap.parse_args()
    score = json.loads(a.score.read_text())
    audio, report = render(score, a.loops)
    scratch = Path(__file__).resolve().parents[2] / "forge" / "work" / "audio"  # approved scratch (TEAM-9.1)
    scratch.mkdir(parents=True, exist_ok=True)
    out = a.out or scratch / f"{a.score.stem}.preview.wav"
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((audio * 32767).astype(np.int16).tobytes())
    report["preview"] = str(out)
    print(json.dumps(report, indent=1))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
