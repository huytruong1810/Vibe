"""retarget: drive the fitted UAL2 rig with UAL2 and UAL1 actions (doctrine L6, ART-9.2).

Imported by animate.py for humanoid templates. Rule, per mapped bone b at every sampled frame:
    T_world(b) = S_world(sb) . S_rest(sb)^-1 . T_ref(b)
S = source armature (UAL2 or UAL1) whose rest is a T-pose; T_ref = our fitted rig in that same
T-pose (its rest, with each arm chain lifted by the A->T rotation the rig stage stored). The source's
world rotation away from its T-pose is applied to ours, so our proportions (4.5-5 heads, L3) stay
ours and UAL1's different bone rolls cancel out. The pelvis follows the source pelvis scaled by leg
length (horizontal travel clamped so lunges stay on canvas), and the lowest bone keeps the source's
height above ground relative to rest, so short legs never sink or float and lying clips stay down.
"""

from __future__ import annotations

import bpy
from mathutils import Matrix, Quaternion, Vector

PELVIS = {"ual2": "pelvis", "ual1": "DEF-hips"}


def _rot(m: Matrix) -> Matrix:
    return m.to_3x3().normalized()


class Retargeter:
    def __init__(self, scene, target, library: str, libs: dict, bone_map_ual1: dict, travel_max: float = 0.1):
        self.scene, self.tgt = scene, target
        with bpy.data.libraries.load(library, link=False) as (src, dst):
            dst.objects = list(src.objects)  # both armatures and their mannequin meshes
            dst.actions = list(src.actions)
        self.src, self.src_mesh = {}, {}
        for o in dst.objects:
            scene.collection.objects.link(o)
            o.hide_render = True
        for o in dst.objects:
            if o.type == "ARMATURE":
                o.animation_data_create()
                self.src["ual2" if o.name.startswith("UAL2") else "ual1"] = o
        for o in dst.objects:
            if o.type == "MESH" and o.parent is not None:
                self.src_mesh["ual2" if o.parent.name.startswith("UAL2") else "ual1"] = o
        self.body = next(o for o in scene.objects if o.type == "MESH" and o.parent is target)
        self.libs = libs
        u = self.src["ual2"]
        tb = target.data.bones
        lift = {sd: Quaternion(target.data.get(f"forge_a2t_{sd}", (1, 0, 0, 0))).to_matrix() for sd in "lr"}

        def arm_side(b):
            while b is not None:
                if b.name in ("upperarm_l", "upperarm_r"):
                    return b.name[-1]
                b = b.parent
            return None

        self.T_ref = {}
        for b in tb:
            r = _rot(target.matrix_world @ b.matrix_local)
            sd = arm_side(b)
            self.T_ref[b.name] = lift[sd] @ r if sd else r
        # target bone -> source bone, per library
        self.map = {"ual2": {b.name: b.name for b in target.data.bones if b.name in u.data.bones},
                    "ual1": {v: k for k, v in bone_map_ual1.items() if v in target.data.bones}}
        self.S_rest = {lib: {b.name: (_rot(o.matrix_world @ b.matrix_local), (o.matrix_world @ b.matrix_local).to_translation())
                             for b in o.data.bones} for lib, o in self.src.items()}
        self.levels: dict[int, list[str]] = {}
        for b in tb:
            d, p = 0, b
            while p.parent:
                d, p = d + 1, p.parent
            self.levels.setdefault(d, []).append(b.name)
        self.pelvis_rest = tb["pelvis"].head_local.copy()
        self.H = max(b.tail_local.z for b in tb)
        self.travel_max = travel_max * self.H
        self.k = {lib: self.pelvis_rest.z / max(self.S_rest[lib][PELVIS[lib]][1].z, 1e-6) for lib in self.src}

    def _mesh_min_z(self, ob) -> float:
        """Lowest evaluated vertex: the ground contact of a posed body (feet standing, back lying)."""
        dg = bpy.context.evaluated_depsgraph_get()
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        z = min((ob.matrix_world @ v.co).z for v in me.vertices)
        ev.to_mesh_clear()
        return z

    def action(self, lib: str, name: str):
        full = name + self.libs[lib]["actionSuffix"]
        if full not in bpy.data.actions:
            raise SystemExit(f"retarget: action {full} not in the UAL library cache")
        return bpy.data.actions[full]

    def pose_at(self, lib: str, act, frame: float) -> None:
        src = self.src[lib]
        src.animation_data.action = act
        self.scene.frame_set(int(frame), subframe=frame - int(frame))
        S_now = {sb.name: _rot(src.matrix_world @ sb.matrix) for sb in src.pose.bones}
        src_low = self._mesh_min_z(self.src_mesh[lib]) if lib in self.src_mesh else 0.0
        src_pel = (src.matrix_world @ src.pose.bones[PELVIS[lib]].head) - self.S_rest[lib][PELVIS[lib]][1]
        src_pel = src_pel * self.k[lib]
        horiz = Vector((src_pel.x, src_pel.y, 0))
        if horiz.length > self.travel_max:  # lunges and rolls move, but never off the canvas
            src_pel = src_pel - horiz + horiz.normalized() * self.travel_max
        pb = self.tgt.pose.bones
        for b in pb:
            b.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()
        mapping = self.map[lib]
        for d in sorted(self.levels):
            for name in self.levels[d]:
                sb = mapping.get(name)
                if sb is None:
                    continue
                Rw = S_now[sb] @ self.S_rest[lib][sb][0].inverted() @ self.T_ref[name]
                b = pb[name]
                head = self.pelvis_rest + src_pel if name == "pelvis" else b.matrix.to_translation()
                b.matrix = Matrix.Translation(head) @ Rw.to_4x4()
                if name != "pelvis":
                    b.location = (0, 0, 0)
            bpy.context.view_layer.update()
        tgt_low = self._mesh_min_z(self.body)
        want = max(0.0, src_low * self.k[lib])  # the source's own clearance, scaled; never below ground
        p = pb["pelvis"]
        m = p.matrix.copy()
        m.translation = m.translation + Vector((0, 0, want - tgt_low))
        p.matrix = m
        bpy.context.view_layer.update()

    def samples(self, segments: list[dict], n: int, loop: bool) -> list[tuple[str, object, float]]:
        segs = []
        for s in segments:
            act = self.action(s["lib"], s["action"])
            f0, f1 = act.frame_range
            a, b = s.get("range", [0.0, 1.0])
            segs.append((s["lib"], act, f0 + (f1 - f0) * a, f0 + (f1 - f0) * b))
        total = sum(e - s0 for _, _, s0, e in segs)
        out = []
        for i in range(n):
            u = i / n if loop else (i / (n - 1) if n > 1 else 0.0)
            pos = u * total
            for lib, act, s0, e in segs:
                if pos <= (e - s0) + 1e-6:
                    out.append((lib, act, s0 + pos))
                    break
                pos -= e - s0
            else:
                lib, act, s0, e = segs[-1]
                out.append((lib, act, e))
        return out

    def bake_clip(self, name: str, segments: list[dict], n: int, loop: bool):
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        self.tgt.animation_data_create()
        self.tgt.animation_data.action = act
        pb = self.tgt.pose.bones
        for b in pb:
            b.rotation_mode = "QUATERNION"
        for i, (lib, src_act, frame) in enumerate(self.samples(segments, n, loop)):
            self.pose_at(lib, src_act, frame)
            for b in pb:
                b.keyframe_insert("rotation_quaternion", frame=i + 1)
                b.keyframe_insert("location", frame=i + 1)
        for fc in act.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "CONSTANT"
        return act
