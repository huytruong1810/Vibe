"""gaits: parametric creature clips for the quadruped template (doctrine L6, ART-9, CMB-3).

Pure Python (no bpy). Each clip function returns one pose per frame:
    {bone: {"rot": (x, y, z) degrees in the bone's local XYZ euler,
            "move": (x, y, z) world-space offset from the rest position}}
Conventions (template quadruped-v1, head toward -Y, up +Z):
  spine/neck/head/pelvis: +rot.x pitches the forward end up; +rot.z yaws it.
  tail bones: +rot.x lifts the tail; +rot.z swings it sideways.
  ik_* paw targets move in world space: -Y is forward, +Z is up.
Poses are keyed on every frame with constant interpolation (ART-9.2), so a clip is exactly
the drawn frames: holds and snaps are authored, never interpolated.
"""

from __future__ import annotations

import math

LEGS = ("fl", "fr", "bl", "br")


class Ctx:
    """Per-asset scale: model units for one art pixel and the template's gait numbers."""

    def __init__(self, gait: dict, height: float, length: float, z_back: float):
        self.g = gait
        self.H, self.L, self.zb = height, length, z_back
        ppu = gait.get("artPxPerUnit", 32)
        self.px_h = 1.0 / ppu  # one art pixel horizontally
        self.px_v = 1.0 / (ppu * math.cos(math.radians(30)))  # one art pixel of screen height from z (30 deg camera)


def _add(pose: dict, bone: str, rot=None, move=None) -> None:
    e = pose.setdefault(bone, {"rot": [0.0, 0.0, 0.0], "move": [0.0, 0.0, 0.0]})
    if rot:
        e["rot"] = [a + b for a, b in zip(e["rot"], rot)]
    if move:
        e["move"] = [a + b for a, b in zip(e["move"], move)]


def _tail(pose: dict, yaw: float, pitch: float = 0.0, falloff=(1.0, 0.9, 0.8, 0.7)) -> None:
    for i, f in enumerate(falloff, start=1):
        _add(pose, f"tail_0{i}", rot=(pitch * f, 0, yaw * f))


def _body(pose: dict, c: Ctx, up_px: float = 0.0, fwd: float = 0.0, pitch: float = 0.0) -> None:
    """Move the whole trunk (pelvis carries spine, neck, head, tail); paws stay on their targets."""
    _add(pose, "pelvis", rot=(pitch, 0, 0), move=(0, -fwd, up_px * c.px_v))


def _breathe(p: dict, c: Ctx, px: float = 1.0) -> None:
    """Raise only the mid-back: spine_02 up, spine_03 (its child) back down, so the head,
    shoulders and forelegs stay where they are and only the back swells."""
    _add(p, "spine_02", move=(0, 0, px * c.px_v))
    _add(p, "spine_03", move=(0, 0, -px * c.px_v))


def _ease(t: float) -> float:
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- locomotion
def _cycle(c: Ctx, n: int, key: str) -> list[dict]:
    g = c.g[key]
    stride, duty, lift = g["strideUnits"], g["duty"], g["liftUnits"]
    poses = []
    for i in range(n):
        p: dict = {}
        for leg in LEGS:
            ph = (i / n + g["phase"][leg]) % 1.0
            if ph < duty:  # stance: paw planted, slides back relative to the body
                s = ph / duty
                y = -stride * duty / 2 + stride * duty * s
                z = 0.0
            else:  # swing: lift and carry forward
                s = (ph - duty) / (1 - duty)
                y = stride * duty / 2 - stride * duty * _ease(s)
                z = lift * math.sin(math.pi * s)
            _add(p, f"ik_{leg}", move=(0, y, z))
        t = i / n
        if key == "walk":
            bob = -g["bobPx"] if i % (n // 2) == 0 else 0  # contact frames sit 1 px lower (ART-9.3)
            _body(p, c, up_px=bob)
            _add(p, "spine_02", rot=(0, 0, g["spineYawDeg"] * math.sin(2 * math.pi * t)))
            _add(p, "neck", rot=(-bob * 2, 0, -g["spineYawDeg"] * math.sin(2 * math.pi * t)))
        else:  # run: bound with gather/extend, 2 px bob, forward lean
            flex = g["spineFlexDeg"] * math.sin(2 * math.pi * t)
            bob = round(g["bobPx"] * max(0.0, math.sin(2 * math.pi * t + math.pi / 2)))
            _body(p, c, up_px=bob, pitch=-g["leanDeg"])
            _add(p, "spine_02", rot=(flex, 0, 0))
            _add(p, "neck", rot=(-flex * 0.6 + g["leanDeg"], 0, 0))
        lag = (i - c.g.get("secondaryLagFrames", 1)) / n  # tail trails the body by one frame (ART-9.4)
        _tail(p, g["tailSwayDeg"] * math.sin(2 * math.pi * lag), pitch=6 if key == "run" else 3)
        poses.append(p)
    return poses


def idle(c: Ctx, n: int) -> list[dict]:
    g = c.g["idle"]
    poses = []
    for i in range(n):
        p: dict = {}
        if (i + 1) in g["breathFrames"]:  # 1 px breathing rise of the back (ART-9.3)
            _breathe(p, c, g["breathPx"])
        lag = (i - c.g.get("secondaryLagFrames", 1)) / n
        _tail(p, g["tailSwayDeg"] * math.sin(2 * math.pi * lag))
        if g.get("headTurnDeg") and i in (3, 4):
            _add(p, "head", rot=(0, 0, g["headTurnDeg"]))
        poses.append(p)
    return poses


def walk(c, n):
    return _cycle(c, n, "walk")


def run(c, n):
    return _cycle(c, n, "run")


# ---------------------------------------------------------------- combat (phases from render_spec)
def _phase_t(i: int, ph: list[int]) -> float:
    a, b = ph
    return 1.0 if b - a <= 1 else (i - a) / (b - a - 1)


def strike(c: Ctx, n: int, phases: dict) -> list[dict]:
    """Lunge bite: crouch and draw back (windup), snap forward (active), settle (recovery)."""
    poses = []
    for i in range(n):
        p: dict = {}
        if i < phases["windup"][1]:
            t = _ease(_phase_t(i, phases["windup"]))
            _body(p, c, up_px=-2 * t, fwd=-0.06 * t, pitch=-6 * t)
            _add(p, "neck", rot=(-12 * t, 0, 0))
            _tail(p, 0, pitch=10 * t)
        elif i < phases["active"][1]:
            _body(p, c, up_px=0, fwd=0.10, pitch=-4)
            _add(p, "neck", rot=(10, 0, 0))
            _add(p, "head", rot=(14, 0, 0))
            _add(p, "ik_fl", move=(0, -0.08, 0.04))
            _add(p, "ik_fr", move=(0, -0.05, 0))
            _tail(p, 0, pitch=-6)
        else:
            t = _phase_t(i, phases["recovery"])
            back = 1 - _ease(t)
            over = 0.02 * math.sin(math.pi * min(1.0, t * 1.6))  # small settle past rest (ART-9.4)
            _body(p, c, fwd=0.10 * back - over, pitch=-4 * back)
            _add(p, "neck", rot=(10 * back, 0, 0))
            _add(p, "head", rot=(14 * back, 0, 0))
            _add(p, "ik_fl", move=(0, -0.08 * back, 0.04 * back))
            _add(p, "ik_fr", move=(0, -0.05 * back, 0))
        poses.append(p)
    return poses


def element(c: Ctx, n: int, phases: dict) -> list[dict]:
    """Water cast: rear up (windup), head and tail high (active), drop with a 1 px squash (recovery)."""
    poses = []
    for i in range(n):
        p: dict = {}
        if i < phases["windup"][1]:
            t = _ease(_phase_t(i, phases["windup"]))
            _rear(p, c, 38 * t)
        elif i < phases["active"][1]:
            _rear(p, c, 42)
            _add(p, "neck", rot=(12, 0, 0))
            _add(p, "head", rot=(16, 0, 0))
            _tail(p, 0, pitch=20)
        else:
            t = _phase_t(i, phases["recovery"])
            k = max(0.0, 1 - _ease(min(1.0, t * 1.5)))
            _rear(p, c, 42 * k)
            if 0 < k < 0.35 or (k == 0 and t < 0.75):
                _body(p, c, up_px=-1)  # landing squash, then settle
        poses.append(p)
    return poses


def _rear(p: dict, c: Ctx, deg: float) -> None:
    """Rear up on the hind legs; forepaws ride up to the chest."""
    f = deg / 40.0
    _body(p, c, pitch=deg)
    for leg in ("fl", "fr"):
        _add(p, f"ik_{leg}", move=(0, 0.1 * c.L * f, 0.45 * c.H * f))


def guard(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _body(p, c, up_px=-2, fwd=-0.03, pitch=-5)
        _add(p, "neck", rot=(-10, 0, 0))
        _add(p, "ik_fl", move=(0, -0.04, 0))
        _add(p, "ik_fr", move=(0, -0.04, 0))
        _tail(p, 0, pitch=8)
        if i % 2:
            _breathe(p, c)
        poses.append(p)
    return poses


def hit(c: Ctx, n: int) -> list[dict]:
    recoil = [1.0, 0.7, 0.3, 0.0]
    poses = []
    for i in range(n):
        k = recoil[min(i, 3)]
        p: dict = {}
        _body(p, c, fwd=-0.08 * k, pitch=8 * k)
        _add(p, "neck", rot=(12 * k, 0, 6 * k))
        _add(p, "head", rot=(10 * k, 0, 0))
        _tail(p, 12 * k, pitch=-8 * k)
        poses.append(p)
    return poses


# ---------------------------------------------------------------- life clips
def eat(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _add(p, "neck", rot=(-34, 0, 0))
        _add(p, "head", rot=(-18 + (6 if i % 2 else 0), 0, 0))  # chew
        _body(p, c, pitch=-4)
        _tail(p, 6 * math.sin(2 * math.pi * (i - 1) / n))
        poses.append(p)
    return poses


def drink(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _add(p, "neck", rot=(-40, 0, 0))
        _add(p, "head", rot=(-24 + (4 if i % 3 == 1 else 0), 0, 0))  # lap
        _body(p, c, up_px=-1, pitch=-6)
        _tail(p, 4 * math.sin(2 * math.pi * (i - 1) / n), pitch=4)
        poses.append(p)
    return poses


def bathe(c: Ctx, n: int) -> list[dict]:
    """Shake off water: the trunk twists side to side, tail whips one frame behind."""
    sway = [0, 14, -14, 12, -10, 0]
    poses = []
    for i in range(n):
        p: dict = {}
        s = sway[i % len(sway)]
        _add(p, "spine_01", rot=(0, 0, s * 0.5))
        _add(p, "spine_02", rot=(0, 0, s))
        _add(p, "spine_03", rot=(0, 0, -s * 0.5))
        _add(p, "neck", rot=(0, 0, -s * 0.8))
        _tail(p, -sway[(i - 1) % len(sway)] * 1.4)
        _body(p, c, up_px=-1)
        poses.append(p)
    return poses


def work(c: Ctx, n: int) -> list[dict]:
    """Dig: forepaws scrape in turn, head down."""
    poses = []
    for i in range(n):
        p: dict = {}
        a, b = ("ik_fl", "ik_fr") if i % 2 == 0 else ("ik_fr", "ik_fl")
        _add(p, a, move=(0, -0.05, 0.05))
        _add(p, b, move=(0, 0.04, 0))
        _add(p, "neck", rot=(-16, 0, 0))
        _body(p, c, up_px=-1, pitch=-6)
        _tail(p, 0, pitch=10)
        poses.append(p)
    return poses


def social(c: Ctx, n: int) -> list[dict]:
    """Sentinel: rear up like the identity master and look around."""
    look = [0, 0, 14, 14, -12, 0]
    poses = []
    for i in range(n):
        p: dict = {}
        _rear(p, c, 46)
        _add(p, "neck", rot=(-8, 0, 0))
        _add(p, "head", rot=(0, 0, look[i % len(look)]))
        if i in (1, 2):
            _add(p, "spine_03", move=(0, 0, c.px_v))
        poses.append(p)
    return poses


def sleep(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _body(p, c, up_px=-(c.zb * 0.3) / c.px_v)
        _add(p, "spine_02", rot=(0, 0, 18))
        _add(p, "spine_03", rot=(0, 0, 18))
        _add(p, "neck", rot=(-22, 0, 34))
        _add(p, "head", rot=(-10, 0, 20))
        _tail(p, -40, pitch=-10)
        if i in (1, 2):
            _breathe(p, c)  # slow breath
        poses.append(p)
    return poses


def _lie(p: dict, c: Ctx, k: float) -> None:
    _body(p, c, up_px=-(c.zb * 0.32 * k) / c.px_v, pitch=-4 * k)
    _add(p, "neck", rot=(-26 * k, 0, 10 * k))
    _add(p, "head", rot=(-14 * k, 0, 0))
    _tail(p, -38 * k)  # curl the tail sideways: a lying otter never points it at the camera


def downed(c: Ctx, n: int) -> list[dict]:
    steps = [0.35, 0.75, 1.0, 1.0, 1.0, 1.0]
    poses = []
    for i in range(n):
        p: dict = {}
        _lie(p, c, steps[min(i, len(steps) - 1)])
        if i == 4:
            _add(p, "head", rot=(4, 0, 0))  # one weak twitch
        poses.append(p)
    return poses


def recovery(c: Ctx, n: int) -> list[dict]:
    steps = [1.0, 0.8, 0.45, 0.1, 0.0, 0.0]
    poses = []
    for i in range(n):
        p: dict = {}
        _lie(p, c, steps[min(i, len(steps) - 1)])
        if i == 4:
            _add(p, "spine_02", rot=(0, 0, 10))  # shake off
            _tail(p, -12)
        poses.append(p)
    return poses


CLIPS = {"idle": idle, "walk": walk, "run": run, "strike": strike, "element": element, "guard": guard, "hit": hit,
         "eat": eat, "drink": drink, "bathe": bathe, "work": work, "social": social, "sleep": sleep,
         "downed": downed, "recovery": recovery}
PHASED = {"strike", "element"}
