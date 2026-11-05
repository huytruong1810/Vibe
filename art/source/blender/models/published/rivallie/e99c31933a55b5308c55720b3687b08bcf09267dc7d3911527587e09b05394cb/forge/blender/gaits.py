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
    """Rear up on the hind legs; forepaws ride up to the chest. The tail lifts and curls so a
    long tail stays on the canvas instead of dropping below the anchor (C3d, Marshstalker)."""
    f = deg / 40.0
    _body(p, c, pitch=deg)
    for leg in ("fl", "fr"):
        _add(p, f"ik_{leg}", move=(0, 0.1 * c.L * f, 0.45 * c.H * f))
    _tail(p, 22 * f, pitch=deg * 0.6, falloff=(1.0, 1.1, 1.2, 1.3))  # +pitch lifts the tail end


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
        _tail(p, 12 * k, pitch=8 * k)
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


def _ground(p: dict, c: Ctx, k: float, splay: bool) -> None:
    """Belly on the ground: the trunk drops by most of the hip height while the IK paws stay
    planted, so the legs fold under it. Forepaws reach forward (sphinx); a downed body splays."""
    drop = c.g.get("lieDropFraction", 0.62) * c.zb * k
    _body(p, c, up_px=-drop / c.px_v, pitch=-3 * k)
    for leg in ("fl", "fr"):
        _add(p, f"ik_{leg}", move=(0, -0.12 * c.L * k, 0))
    if splay:
        _add(p, "ik_bl", move=(0.07 * c.L * k, 0.05 * c.L * k, 0))
        _add(p, "ik_br", move=(-0.07 * c.L * k, 0.05 * c.L * k, 0))


def sleep(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _ground(p, c, 1.0, splay=False)
        _add(p, "spine_02", rot=(0, 0, 16))
        _add(p, "spine_03", rot=(0, 0, 16))
        _add(p, "neck", rot=(-30, 0, 34))
        _add(p, "head", rot=(-16, 0, 18))
        _tail(p, -45, pitch=4)
        if i in (1, 2):
            _breathe(p, c)  # slow breath
        poses.append(p)
    return poses


def _lie(p: dict, c: Ctx, k: float) -> None:
    """Downed: flat on the belly, legs splayed, head on the ground, tail limp to the side."""
    _ground(p, c, k, splay=True)
    _add(p, "neck", rot=(-34 * k, 0, 12 * k))
    _add(p, "head", rot=(-18 * k, 0, 0))
    _tail(p, -38 * k)  # curl the tail sideways: a lying body never points it at the camera


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


# ================================================================ shelled-v1 (steamshell)
# The quadruped clips with the shelled template's gait numbers, except where a shell changes
# the acting: guard, sleep and downed withdraw under the shell; element vents steam; social bobs.
def _withdraw(p: dict, c: Ctx, k: float, splay: bool = False) -> None:
    w = c.g["withdraw"]
    _add(p, "head", rot=(-10 * k, 0, 0), move=(0, w["headBackFraction"] * c.L * k, -w["headDropFraction"] * c.H * k))
    drop = w["dropFraction"] * c.zb * k
    _body(p, c, up_px=-drop / c.px_v)
    tuck = w["pawInFraction"] * c.L * k * (-0.8 if splay else 1.0)
    for leg, sx, sy in (("fl", -1, 1), ("fr", 1, 1), ("bl", -1, -1), ("br", 1, -1)):
        _add(p, f"ik_{leg}", move=(sx * tuck, sy * tuck, 0))
    _tail(p, 0, pitch=-12 * k)


def shell_guard(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _withdraw(p, c, 1.0)
        if i % 2:
            _add(p, "shell", move=(0, 0, c.px_v))  # braced breathing under the shell
        poses.append(p)
    return poses


def shell_sleep(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _withdraw(p, c, 1.0)
        if i in (1, 2):
            _add(p, "shell", move=(0, 0, c.px_v))
        poses.append(p)
    return poses


def shell_downed(c: Ctx, n: int) -> list[dict]:
    steps = [0.35, 0.75, 1.0, 1.0, 1.0, 1.0]
    poses = []
    for i in range(n):
        p: dict = {}
        k = steps[min(i, len(steps) - 1)]
        _withdraw(p, c, k, splay=True)
        _add(p, "pelvis", rot=(0, 6 * k, 0))  # tipped onto one side
        _add(p, "head", move=(0, -0.07 * c.L * k, 0))  # head lolls half out
        if i == 4:
            _add(p, "head", rot=(4, 0, 0))
        poses.append(p)
    return poses


def shell_recovery(c: Ctx, n: int) -> list[dict]:
    steps = [1.0, 0.8, 0.45, 0.1, 0.0, 0.0]
    poses = []
    for i in range(n):
        p: dict = {}
        k = steps[min(i, len(steps) - 1)]
        _withdraw(p, c, k, splay=True)
        _add(p, "pelvis", rot=(0, 6 * k, 0))
        if i == 4:
            _add(p, "shell", move=(0, 0, c.px_v))  # settle
        poses.append(p)
    return poses


def shell_vent(c: Ctx, n: int, phases: dict) -> list[dict]:
    """Steam vent: hunker down (windup), shell pops up with the head thrust high (active), settle."""
    poses = []
    for i in range(n):
        p: dict = {}
        if i < phases["windup"][1]:
            t = _ease(_phase_t(i, phases["windup"]))
            _withdraw(p, c, 0.5 * t)
        elif i < phases["active"][1]:
            _body(p, c, up_px=1)
            _add(p, "shell", move=(0, 0, 2 * c.px_v))
            _add(p, "neck", rot=(24, 0, 0))
            _add(p, "head", rot=(16, 0, 0))
        else:
            t = _phase_t(i, phases["recovery"])
            k = 1 - _ease(t)
            _add(p, "shell", move=(0, 0, round(2 * k) * c.px_v))
            _add(p, "neck", rot=(24 * k, 0, 0))
            if 0.3 < t < 0.7:
                _body(p, c, up_px=-1)
        poses.append(p)
    return poses


def shell_social(c: Ctx, n: int) -> list[dict]:
    """Greeting: stretch the neck up and bob the head twice."""
    bob = [0, 14, 0, 14, 0, 0]
    poses = []
    for i in range(n):
        p: dict = {}
        _add(p, "neck", rot=(18, 0, 0), move=(0, -0.04 * c.L, 0))
        _add(p, "head", rot=(-bob[i % len(bob)], 0, 0))
        poses.append(p)
    return poses


def shell_eat(c: Ctx, n: int) -> list[dict]:
    """Graze: a low head reaches the ground on a short-legged body without the quadruped's deep neck bend."""
    poses = []
    for i in range(n):
        p: dict = {}
        _add(p, "neck", rot=(-16, 0, 0))
        _add(p, "head", rot=(-14 + (6 if i % 2 else 0), 0, 0))
        poses.append(p)
    return poses


def shell_drink(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _add(p, "neck", rot=(-20, 0, 0))
        _add(p, "head", rot=(-16 + (4 if i % 3 == 1 else 0), 0, 0))
        _body(p, c, up_px=-1)
        poses.append(p)
    return poses


def shell_work(c: Ctx, n: int) -> list[dict]:
    """Dig: forepaws scrape in turn under a level head."""
    poses = []
    for i in range(n):
        p: dict = {}
        a, b = ("ik_fl", "ik_fr") if i % 2 == 0 else ("ik_fr", "ik_fl")
        _add(p, a, move=(0, -0.04, 0.04))
        _add(p, b, move=(0, 0.03, 0))
        _add(p, "neck", rot=(-6, 0, 0))
        _body(p, c, up_px=-1 if i % 2 else 0)
        poses.append(p)
    return poses


SHELLED = {**CLIPS, "work": shell_work, "eat": shell_eat, "drink": shell_drink, "element": shell_vent, "guard": shell_guard, "social": shell_social, "sleep": shell_sleep,
           "downed": shell_downed, "recovery": shell_recovery}


# ================================================================ winged-v1 (zephyrit, cindermoth)
# Bones: pelvis (hip -> chest), spine_01 (chest -> head base), head, tail_01/02, wing_{l,r}_01/02.
# Wing conventions (rest roll keeps local Z up): +rot.x raises both wing tips; rot.z = side * deg
# sweeps the tips back (side +1 left, -1 right). Airborne clips add the hover lift to the body.
def _wings(p: dict, up: float, tip: float | None = None, fold: float = 0.0) -> None:
    tip = up * 0.4 if tip is None else tip
    for side, s in (("l", 1), ("r", -1)):
        _add(p, f"wing_{side}_01", rot=(up, 0, s * fold))
        _add(p, f"wing_{side}_02", rot=(tip, 0, 0))


def _hover(p: dict, c: Ctx, extra_px: float = 0.0, fwd: float = 0.0, pitch: float = 0.0) -> None:
    _body(p, c, up_px=c.g["hoverPx"] + extra_px, fwd=fwd, pitch=pitch)


def _wtail(p: dict, yaw: float, pitch: float = 0.0) -> None:
    _add(p, "tail_01", rot=(pitch, 0, yaw))
    _add(p, "tail_02", rot=(pitch * 0.8, 0, yaw * 0.8))


def _beat(seq: list[float], i: int) -> tuple[float, float]:
    """Wing root angle this frame and the tip angle lagging one frame behind (ART-9.4)."""
    return seq[i % len(seq)], 0.4 * seq[(i - 1) % len(seq)]


def w_idle(c: Ctx, n: int) -> list[dict]:
    up, down = c.g["idle"]["beatDeg"]
    seq, bob = [up, up, 0, down, down, 0], [0, 0, 0, 1, 1, 0]
    poses = []
    for i in range(n):
        p: dict = {}
        a, b = _beat(seq, i)
        _wings(p, a, b)
        _hover(p, c, c.g["idle"]["bobPx"] * bob[i % len(bob)])
        _wtail(p, 0, pitch=-3 * bob[(i - 1) % len(bob)])
        poses.append(p)
    return poses


def _fly(c: Ctx, n: int, key: str) -> list[dict]:
    g = c.g[key]
    up, down = g["beatDeg"]
    per = max(2, n // g["beatsPerCycle"])
    seq = [up + (down - up) * (0.5 - 0.5 * math.cos(2 * math.pi * j / per)) for j in range(per)]
    poses = []
    for i in range(n):
        p: dict = {}
        a, b = _beat(seq, i)
        _wings(p, a, b, fold=g.get("sweepDeg", 0))
        lift = g["bobPx"] if a < 0 else 0  # the downstroke lifts the body
        _hover(p, c, lift, pitch=-g["leanDeg"])
        _wtail(p, g["tailSwayDeg"] * math.sin(2 * math.pi * (i - 1) / n), pitch=4)
        poses.append(p)
    return poses


def w_walk(c, n):
    return _fly(c, n, "walk")


def w_run(c, n):
    return _fly(c, n, "run")


def w_strike(c: Ctx, n: int, phases: dict) -> list[dict]:
    """Dive peck: rise and draw back with wings high (windup), swoop forward with wings swept (active), climb back."""
    poses = []
    for i in range(n):
        p: dict = {}
        if i < phases["windup"][1]:
            t = _ease(_phase_t(i, phases["windup"]))
            _hover(p, c, 3 * t, fwd=-0.06 * t, pitch=10 * t)
            _wings(p, 40 * t)
        elif i < phases["active"][1]:
            _hover(p, c, -2, fwd=0.12, pitch=-22)
            _wings(p, -10, fold=40)
            _add(p, "head", rot=(-12, 0, 0))
            _wtail(p, 0, pitch=12)
        else:
            t = _phase_t(i, phases["recovery"])
            k = 1 - _ease(t)
            _hover(p, c, -2 * k, fwd=0.12 * k, pitch=-22 * k)
            a = 30 if i % 2 else -16
            _wings(p, a * (1 - k) - 10 * k, fold=40 * k)
        poses.append(p)
    return poses


def w_element(c: Ctx, n: int, phases: dict) -> list[dict]:
    """Gust: climb with wings raised (windup), wings flung wide and flat, head up (active), settle."""
    poses = []
    for i in range(n):
        p: dict = {}
        if i < phases["windup"][1]:
            t = _ease(_phase_t(i, phases["windup"]))
            _hover(p, c, 2 * t, pitch=8 * t)
            _wings(p, 50 * t, 20 * t)
        elif i < phases["active"][1]:
            _hover(p, c, 2, pitch=14)
            _wings(p, -24, -10)
            _add(p, "head", rot=(14, 0, 0))
            _wtail(p, 0, pitch=-14)
        else:
            t = _phase_t(i, phases["recovery"])
            k = 1 - _ease(t)
            _hover(p, c, 2 * k, pitch=14 * k)
            _wings(p, 20 * (1 - k) - 24 * k if i % 2 else -10 * (1 - k) - 24 * k)
        poses.append(p)
    return poses


def w_guard(c: Ctx, n: int) -> list[dict]:
    """Wings wrapped forward around the body, hovering lower."""
    poses = []
    for i in range(n):
        p: dict = {}
        _hover(p, c, -2 + (1 if i % 2 else 0), pitch=6)
        _wings(p, -14, -8, fold=-34)
        _add(p, "head", rot=(-14, 0, 0))
        poses.append(p)
    return poses


def w_hit(c: Ctx, n: int) -> list[dict]:
    recoil = [1.0, 0.7, 0.3, 0.0]
    poses = []
    for i in range(n):
        k = recoil[min(i, 3)]
        p: dict = {}
        _hover(p, c, 2 * k, fwd=-0.08 * k, pitch=16 * k)
        _add(p, "wing_l_01", rot=(36 * k, 0, 0))
        _add(p, "wing_r_01", rot=(-20 * k, 0, 0))
        _add(p, "head", rot=(12 * k, 0, 8 * k))
        _wtail(p, 10 * k, pitch=-10 * k)
        poses.append(p)
    return poses


def _landed(p: dict, c: Ctx) -> None:
    _wings(p, -8, -4, fold=c.g["foldDeg"])


def w_eat(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _landed(p, c)
        _body(p, c, pitch=-8)
        _add(p, "head", rot=(-30 + (8 if i % 2 else 0), 0, 0))  # peck
        poses.append(p)
    return poses


def w_drink(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _landed(p, c)
        _body(p, c, pitch=-12)
        _add(p, "head", rot=(-38 + (5 if i % 3 == 1 else 0), 0, 0))
        poses.append(p)
    return poses


def w_bathe(c: Ctx, n: int) -> list[dict]:
    """Sand bath: settled on the ground, wings fluttering and the body shimmying."""
    poses = []
    for i in range(n):
        p: dict = {}
        a = 18 if i % 2 else -6
        _wings(p, a, fold=24)
        _body(p, c, up_px=-1 if i % 2 else 0)
        _add(p, "pelvis", rot=(0, 6 if i % 2 else -6, 0))
        _wtail(p, 10 if i % 2 else -10)
        poses.append(p)
    return poses


def w_work(c: Ctx, n: int) -> list[dict]:
    """Forage: hover low over the spot, pecking, with short beats."""
    seq = [22, 0, -14, 0]
    poses = []
    for i in range(n):
        p: dict = {}
        a, b = _beat(seq, i)
        _wings(p, a, b)
        _hover(p, c, -c.g["hoverPx"] / 2, pitch=-10)
        _add(p, "head", rot=(-24 if i % 3 == 2 else -10, 0, 0))
        poses.append(p)
    return poses


def w_social(c: Ctx, n: int) -> list[dict]:
    """Display: wings held high and still, head cocked one way then the other."""
    look = [0, 16, 16, -16, -16, 0]
    poses = []
    for i in range(n):
        p: dict = {}
        _hover(p, c, 1 if i in (1, 2) else 0)
        _wings(p, 46, 18)
        _add(p, "head", rot=(6, 0, look[i % len(look)]))
        poses.append(p)
    return poses


def w_sleep(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _landed(p, c)
        _body(p, c, pitch=-4)
        _add(p, "head", rot=(-26, 0, 22))
        _wtail(p, -20)
        if i in (1, 2):
            _add(p, "spine_01", move=(0, 0, c.px_v))
        poses.append(p)
    return poses


def _fallen(p: dict, c: Ctx, k: float) -> None:
    """Downed on the ground: wings splayed flat, body tipped on its side, head down."""
    _body(p, c, up_px=c.g["hoverPx"] * (1 - k), pitch=-6 * k)
    _add(p, "pelvis", rot=(0, 8 * k, 0))
    _wings(p, -4 * k, 0, fold=12 * k)  # level wings lie flat; drooping them would sink the near tip below the ground
    _add(p, "head", rot=(-20 * k, 0, 14 * k))
    _wtail(p, -16 * k)


def w_downed(c: Ctx, n: int) -> list[dict]:
    steps = [0.35, 0.75, 1.0, 1.0, 1.0, 1.0]
    poses = []
    for i in range(n):
        p: dict = {}
        _fallen(p, c, steps[min(i, len(steps) - 1)])
        if i == 4:
            _add(p, "wing_l_02", rot=(6, 0, 0))  # one weak twitch
        poses.append(p)
    return poses


def w_recovery(c: Ctx, n: int) -> list[dict]:
    steps = [1.0, 0.8, 0.45, 0.1, 0.0, 0.0]
    poses = []
    for i in range(n):
        p: dict = {}
        k = steps[min(i, len(steps) - 1)]
        _fallen(p, c, k)
        if k < 0.5:
            _wings(p, 24 if i % 2 else -12)  # beats lift it back to the hover
        poses.append(p)
    return poses


WINGED = {"idle": w_idle, "walk": w_walk, "run": w_run, "strike": w_strike, "element": w_element, "guard": w_guard,
          "hit": w_hit, "eat": w_eat, "drink": w_drink, "bathe": w_bathe, "work": w_work, "social": w_social,
          "sleep": w_sleep, "downed": w_downed, "recovery": w_recovery}


# ================================================================ mushroom-biped-v1 (ignicap)
# Bones: pelvis and stem stand vertical, head is the cap; legs on IK targets ik_l / ik_r.
# Vertical-bone conventions (rest roll points local Z forward): +rot.x tips the top forward,
# +rot.z tips it toward the creature's right (-X), +rot.y turns the face toward its left (+X).
def _feet(c: Ctx, n: int, i: int, g: dict) -> tuple[dict, float]:
    """Alternating steps; returns the IK offsets and the stance weight of the left foot (1 = all on it)."""
    p: dict = {}
    stride, duty, lift = g["strideUnits"], g["duty"], g["liftUnits"]
    left_load = 0.0
    for leg, ph0 in (("l", 0.0), ("r", 0.5)):
        ph = (i / n + ph0) % 1.0
        if ph < duty:
            s = ph / duty
            y, z = -stride * duty / 2 + stride * duty * s, 0.0
            if leg == "l":
                left_load = math.sin(math.pi * s)
        else:
            s = (ph - duty) / (1 - duty)
            y, z = stride * duty / 2 - stride * duty * _ease(s), lift * math.sin(math.pi * s)
        _add(p, f"ik_{leg}", move=(0, y, z))
    return p, left_load


def _waddle(c: Ctx, n: int, key: str) -> list[dict]:
    g = c.g[key]
    poses = []
    for i in range(n):
        p, _ = _feet(c, n, i, g)
        roll = g["rollDeg"] * math.sin(2 * math.pi * i / n)  # lean over the planted foot
        lag = g["capLagDeg"] * math.sin(2 * math.pi * (i - 1) / n)
        bob = -g["bobPx"] if i % (n // 2) == 0 else 0  # contact frames sit lower (ART-9.3)
        _add(p, "pelvis", rot=(g.get("leanDeg", 0), 0, -roll), move=(0, 0, bob * c.px_v))
        _add(p, "head", rot=(0, 0, lag * 0.8))
        poses.append(p)
    return poses


def b_idle(c: Ctx, n: int) -> list[dict]:
    g = c.g["idle"]
    poses = []
    for i in range(n):
        p: dict = {}
        if (i + 1) in g["breathFrames"]:
            _add(p, "stem", move=(0, 0, g["breathPx"] * c.px_v))
        if g.get("capTiltDeg") and i in (4, 5):
            _add(p, "head", rot=(0, 0, g["capTiltDeg"]))
        poses.append(p)
    return poses


def b_walk(c, n):
    return _waddle(c, n, "walk")


def b_run(c, n):
    return _waddle(c, n, "run")


def _crouch(p: dict, c: Ctx, px: float) -> None:
    _add(p, "pelvis", move=(0, 0, -px * c.px_v))


def b_strike(c: Ctx, n: int, phases: dict) -> list[dict]:
    """Cap butt: crouch and rock back (windup), lunge with the cap forward (active), rock back to rest."""
    poses = []
    for i in range(n):
        p: dict = {}
        if i < phases["windup"][1]:
            t = _ease(_phase_t(i, phases["windup"]))
            _crouch(p, c, 2 * t)
            _add(p, "pelvis", rot=(-10 * t, 0, 0))
            _add(p, "head", rot=(-8 * t, 0, 0))
        elif i < phases["active"][1]:
            _add(p, "pelvis", rot=(12, 0, 0), move=(0, -0.04, 0))
            _add(p, "head", rot=(14, 0, 0))
            _add(p, "ik_l", move=(0, -0.04, 0))
        else:
            t = _phase_t(i, phases["recovery"])
            k = 1 - _ease(t)
            over = -4 * math.sin(math.pi * min(1.0, t * 1.6))  # settle past rest (ART-9.4)
            _add(p, "pelvis", rot=(12 * k + over, 0, 0), move=(0, -0.04 * k, 0))
            _add(p, "head", rot=(14 * k, 0, 0))
            _add(p, "ik_l", move=(0, -0.04 * k, 0))
        poses.append(p)
    return poses


def b_element(c: Ctx, n: int, phases: dict) -> list[dict]:
    """Spore flare: squat (windup), spring up with the cap thrown back (active), land with a squash."""
    poses = []
    for i in range(n):
        p: dict = {}
        if i < phases["windup"][1]:
            t = _ease(_phase_t(i, phases["windup"]))
            _crouch(p, c, 3 * t)
            _add(p, "head", rot=(10 * t, 0, 0))
        elif i < phases["active"][1]:
            _add(p, "pelvis", move=(0, 0, 3 * c.px_v))
            _add(p, "ik_l", move=(0, 0, 3 * c.px_v))
            _add(p, "ik_r", move=(0, 0, 3 * c.px_v))
            _add(p, "head", rot=(-16, 0, 0))
            _add(p, "stem", rot=(-6, 0, 0))
        else:
            t = _phase_t(i, phases["recovery"])
            if t < 0.35:
                _crouch(p, c, 2)  # landing squash
            elif t < 0.6:
                _crouch(p, c, 1)
        poses.append(p)
    return poses


def b_guard(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _crouch(p, c, 2 + (1 if i % 2 else 0))
        _add(p, "stem", rot=(10, 0, 0))
        _add(p, "head", rot=(14, 0, 0))  # cap pulled down like a shield
        poses.append(p)
    return poses


def b_hit(c: Ctx, n: int) -> list[dict]:
    recoil = [1.0, 0.7, 0.3, 0.0]
    poses = []
    for i in range(n):
        k = recoil[min(i, 3)]
        p: dict = {}
        _add(p, "pelvis", rot=(-12 * k, 0, 4 * k), move=(0, 0.05 * k, 0))
        _add(p, "head", rot=(-10 * k, 0, -8 * k))
        poses.append(p)
    return poses


def b_eat(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _add(p, "pelvis", rot=(10, 0, 0))
        _add(p, "stem", rot=(22 + (5 if i % 2 else 0), 0, 0))  # chew bob
        _crouch(p, c, 1)
        poses.append(p)
    return poses


def b_drink(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _add(p, "pelvis", rot=(16, 0, 0))
        _add(p, "stem", rot=(26 + (4 if i % 3 == 1 else 0), 0, 0))
        _crouch(p, c, 2)
        poses.append(p)
    return poses


def b_bathe(c: Ctx, n: int) -> list[dict]:
    """Wallow: wiggle side to side, the cap swinging one frame behind."""
    sway = [0, 10, -10, 9, -7, 0]
    poses = []
    for i in range(n):
        p: dict = {}
        _crouch(p, c, 1)
        _add(p, "pelvis", rot=(0, 0, sway[i % len(sway)]))
        _add(p, "head", rot=(0, 0, -sway[(i - 1) % len(sway)] * 0.8))
        poses.append(p)
    return poses


def b_work(c: Ctx, n: int) -> list[dict]:
    """Stomp the ground with alternate feet, leaning in."""
    poses = []
    for i in range(n):
        p: dict = {}
        leg = "ik_l" if i % 2 == 0 else "ik_r"
        if i % 3 != 2:
            _add(p, leg, move=(0, -0.03, 0.06 if i % 3 == 0 else 0.0))
        _add(p, "pelvis", rot=(8, 0, 4 if leg == "ik_r" else -4))
        poses.append(p)
    return poses


def b_social(c: Ctx, n: int) -> list[dict]:
    """Happy hop: two small hops, the cap bouncing behind."""
    hop = [0, 2, 0, 2, 0, 0]
    poses = []
    for i in range(n):
        p: dict = {}
        h = hop[i % len(hop)] * c.px_v
        _add(p, "pelvis", move=(0, 0, h))
        _add(p, "ik_l", move=(0, 0, h))
        _add(p, "ik_r", move=(0, 0, h))
        _add(p, "head", rot=(-6 if hop[(i - 1) % len(hop)] else 0, 0, 0))
        if i == 0:
            _crouch(p, c, 1)
        poses.append(p)
    return poses


def _sit(p: dict, c: Ctx, k: float, back: float = 0.0) -> None:
    drop = c.g["sitDropFraction"] * c.zb * k
    _add(p, "pelvis", rot=(-back * k, 0, 0), move=(0, 0.02 * c.L * k, -drop))
    for leg in ("ik_l", "ik_r"):
        _add(p, leg, move=(0, -0.1 * c.L * k, 0))


def b_sleep(c: Ctx, n: int) -> list[dict]:
    poses = []
    for i in range(n):
        p: dict = {}
        _sit(p, c, 1.0)
        _add(p, "stem", rot=(10, 0, 0))
        _add(p, "head", rot=(12, 0, -8))  # cap drooped
        if i in (1, 2):
            _add(p, "stem", move=(0, 0, c.px_v))
        poses.append(p)
    return poses


def _flop(p: dict, c: Ctx, k: float) -> None:
    _sit(p, c, k, back=22)
    _add(p, "head", rot=(-14 * k, 0, 12 * k))
    _add(p, "ik_l", move=(0.05 * c.L * k, 0, 0))
    _add(p, "ik_r", move=(-0.05 * c.L * k, 0, 0))


def b_downed(c: Ctx, n: int) -> list[dict]:
    steps = [0.35, 0.75, 1.0, 1.0, 1.0, 1.0]
    poses = []
    for i in range(n):
        p: dict = {}
        _flop(p, c, steps[min(i, len(steps) - 1)])
        if i == 4:
            _add(p, "head", rot=(4, 0, 0))
        poses.append(p)
    return poses


def b_recovery(c: Ctx, n: int) -> list[dict]:
    steps = [1.0, 0.8, 0.45, 0.1, 0.0, 0.0]
    poses = []
    for i in range(n):
        p: dict = {}
        _flop(p, c, steps[min(i, len(steps) - 1)])
        if i == 4:
            _add(p, "head", rot=(0, 0, 6))  # shake off
        poses.append(p)
    return poses


BIPED = {"idle": b_idle, "walk": b_walk, "run": b_run, "strike": b_strike, "element": b_element, "guard": b_guard,
         "hit": b_hit, "eat": b_eat, "drink": b_drink, "bathe": b_bathe, "work": b_work, "social": b_social,
         "sleep": b_sleep, "downed": b_downed, "recovery": b_recovery}

TEMPLATES = {"quadruped": CLIPS, "shelled": SHELLED, "winged": WINGED, "mushroom-biped": BIPED}


def clips_for(template: dict) -> dict:
    """Clip functions for a skeleton template (spec 'plan'; quadruped when absent)."""
    return TEMPLATES[template.get("plan", "quadruped")]
