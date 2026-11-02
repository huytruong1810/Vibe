"""riglib: shared rig-stage helpers for every template (quadruped, humanoid). Imported by rig scripts.

transfer_weights: automatic weights on a watertight voxel proxy, nearest-bone fallback for any proxy
vertex heat weighting leaves empty, then Data Transfer onto the real mesh (doctrine PRD-1, L6).
Preview helpers render the rig_preview shots the operator must look at (PRD-5).
"""

from __future__ import annotations

import os

import bmesh
import bpy
import numpy as np
from mathutils import Vector


def transfer_weights(scene, body, arm, voxel_size: float, max_influences: int) -> tuple[int, int]:
    """Weight `body` to `arm`. Returns (proxy vertices given a fallback bone, unweighted body vertices)."""
    proxy = body.copy()
    proxy.data = body.data.copy()
    proxy.name = "WeightProxy"
    scene.collection.objects.link(proxy)
    for vg in list(proxy.vertex_groups):
        proxy.vertex_groups.remove(vg)
    rm = proxy.modifiers.new("vox", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = voxel_size
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = proxy
    proxy.select_set(True)
    bpy.ops.object.modifier_apply(modifier="vox")
    proxy.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")

    segs = [(b.name, np.array(b.head_local), np.array(b.tail_local)) for b in arm.data.bones if b.use_deform]
    fallback = 0
    for v in proxy.data.vertices:
        if sum(g.weight for g in v.groups) > 1e-6:
            continue
        p = np.array(v.co)
        best, bd = None, 1e9
        for name, a, b in segs:
            ab = b - a
            t = np.clip(np.dot(p - a, ab) / max(np.dot(ab, ab), 1e-9), 0, 1)
            d = np.linalg.norm(p - (a + t * ab))
            if d < bd:
                best, bd = name, d
        grp = proxy.vertex_groups.get(best) or proxy.vertex_groups.new(name=best)
        grp.add([v.index], 1.0, "REPLACE")
        fallback += 1

    for vg in list(body.vertex_groups):
        body.vertex_groups.remove(vg)
    dt = body.modifiers.new("weights", "DATA_TRANSFER")
    dt.object = proxy
    dt.use_vert_data = True
    dt.data_types_verts = {"VGROUP_WEIGHTS"}
    dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"
    dt.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.datalayout_transfer(modifier="weights")
    bpy.ops.object.modifier_apply(modifier="weights")
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.ops.object.vertex_group_limit_total(limit=max_influences)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    unweighted = sum(1 for v in body.data.vertices if sum(g.weight for g in v.groups) < 1e-6)
    bpy.data.objects.remove(proxy, do_unlink=True)
    body.parent = arm
    mod = body.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    return fallback, unweighted


class Preview:
    """Workbench preview camera plus landmark markers; `shot` renders one PNG."""

    def __init__(self, scene, size_units: float, target: Vector, out_dir: str, res: int = 360):
        self.scene, self.target, self.out_dir = scene, target, out_dir
        scene.render.engine = "BLENDER_WORKBENCH"
        scene.display.shading.light = "FLAT"
        scene.display.shading.color_type = "VERTEX"
        scene.render.film_transparent = False
        scene.render.resolution_x = scene.render.resolution_y = res
        cam_data = bpy.data.cameras.new("pcam")
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = size_units * 1.5
        self.cam = bpy.data.objects.new("pcam", cam_data)
        scene.collection.objects.link(self.cam)
        scene.camera = self.cam
        self.markers: list = []
        os.makedirs(out_dir, exist_ok=True)

    def add_markers(self, landmarks: dict, radius: float, color_of) -> None:
        for name, p in landmarks.items():
            bm = bmesh.new()
            bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=radius)
            me = bpy.data.meshes.new(f"lm_{name}")
            bm.to_mesh(me)
            bm.free()
            col = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
            for c in col.data:
                c.color = color_of(name)
            ob = bpy.data.objects.new(f"lm_{name}", me)
            ob.location = Vector(p)
            ob.show_in_front = True
            self.scene.collection.objects.link(ob)
            self.markers.append(ob)

    def shot(self, name: str, view: Vector, show_markers: bool) -> str:
        for m in self.markers:
            m.hide_render = not show_markers
        self.cam.location = self.target + view.normalized() * 10
        self.cam.rotation_euler = (self.target - self.cam.location).to_track_quat("-Z", "Y").to_euler()
        path = os.path.join(self.out_dir, f"rig_{name}.png")
        self.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        return name


# ---------------------------------------------------------------- shared by rig_winged.py and rig_biped.py
def front_mesh(body, yaw_deg):
    """Front view stays facing -Y (recipe yaw overrides); centre x/y, ground z. Returns the vertex array."""
    import math

    from mathutils import Matrix

    if yaw_deg:
        body.data.transform(Matrix.Rotation(math.radians(yaw_deg), 4, "Z"))
    v = np.array([tuple(body.matrix_world @ p.co) for p in body.data.vertices])
    body.data.transform(Matrix.Translation(Vector((-(v[:, 0].min() + v[:, 0].max()) / 2, -(v[:, 1].min() + v[:, 1].max()) / 2, -v[:, 2].min()))))
    body.data.update()
    return np.array([tuple(body.matrix_world @ p.co) for p in body.data.vertices])


def build_armature(scene, template: dict, lmk: dict, height: float, length: float):
    """Armature "Rig" from the template's landmark-referenced bones, with its IK constraints."""
    arm_data = bpy.data.armatures.new("Rig")
    arm = bpy.data.objects.new("Rig", arm_data)
    scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")

    def resolve(ref: str) -> Vector:
        if ref == "ground":
            return Vector((0, 0, 0))
        if ref == "ground+up":
            return Vector((0, 0, 0.1 * height))
        base, _, mod = ref.partition("+")
        return Vector(lmk[base]) + {"": Vector(), "up": Vector((0, 0, 0.06 * height)), "fwd": Vector((0, -0.06 * length, 0))}[mod]

    eb = arm_data.edit_bones
    for b in template["bones"]:
        e = eb.new(b["name"])
        e.head, e.tail = resolve(b["head"]), resolve(b["tail"])
        if (e.tail - e.head).length < 1e-4:
            e.tail = e.head + Vector((0, 0, 0.02 * height))
        e.use_deform = b["deform"]
        vertical = abs((e.tail - e.head).normalized().z) > 0.7
        e.align_roll(Vector((0, -1, 0)) if vertical else Vector((0, 0, 1)))
    for b in template["bones"]:
        if b["parent"]:
            eb[b["name"]].parent = eb[b["parent"]]
            eb[b["name"]].use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    for spec_ik in template.get("ik", []):
        c = arm.pose.bones[spec_ik["bone"]].constraints.new("IK")
        c.target, c.subtarget, c.chain_count = arm, spec_ik["target"], spec_ik["chain"]
        c.use_tail = True
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
    return arm


def set_pose(arm, rot: dict, move: dict | None = None) -> None:
    """Preview pose: local XYZ euler degrees per bone, world-space offsets per bone."""
    import math

    for b in arm.pose.bones:
        b.rotation_euler = (0, 0, 0)
        b.location = (0, 0, 0)
    for name, r in rot.items():
        arm.pose.bones[name].rotation_euler = tuple(math.radians(a) for a in r)
    for name, d in (move or {}).items():
        arm.pose.bones[name].location = arm.data.bones[name].matrix_local.to_3x3().inverted() @ Vector(d)
    bpy.context.view_layer.update()


def slice_widths(v: np.ndarray, z_lo: float, z_hi: float, step: float) -> list[tuple[float, float, int]]:
    """(z centre, x-extent, count) of horizontal slices from z_lo to z_hi."""
    out = []
    z = z_lo
    while z < z_hi:
        m = (v[:, 2] >= z) & (v[:, 2] < z + step)
        out.append((z + step / 2, float(np.ptp(v[m, 0])) if m.sum() > 2 else 0.0, int(m.sum())))
        z += step
    return out
