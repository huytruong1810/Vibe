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
