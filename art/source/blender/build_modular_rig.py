"""
Hearthwild Master Modular Humanoid Rig & Socket System.
Constructs a standardized, reusable low-poly stylized humanoid rig in Blender 4.2+
with standard bone hierarchy, modular equipment sockets, full vertex weighting,
procedural idle breathing & walk animations, and modular hair/outfit/tool attachments
for Player Aqualia and key villagers.

Outputs:
  art/source/blender/models/humanoid_modular_base.blend
"""

import sys
import math
from pathlib import Path

try:
    import bpy
    import bmesh
    from mathutils import Vector, Euler, Matrix
except ImportError:
    print("This script must be executed inside Blender: blender -b -P build_modular_rig.py")
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[3]
MODELS_DIR = REPO_ROOT / "art" / "source" / "blender" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUT_BLEND = MODELS_DIR / "humanoid_modular_base.blend"

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def add_materials(mesh: bpy.types.Mesh, mat_list: list[bpy.types.Material]):
    for m in mat_list:
        mesh.materials.append(m)

def create_material(name: str, r: float, g: float, b: float, a: float = 1.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (r, g, b, a)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (r, g, b, a)
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.7
    return mat

def hex_to_rgb(hex_str: str) -> tuple[float, float, float]:
    hex_str = hex_str.lstrip("#")
    return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def add_box_bmesh(bm, center, size, mat_idx=0):
    cx, cy, cz = center
    sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2
    verts = [
        bm.verts.new((cx - sx, cy - sy, cz - sz)),
        bm.verts.new((cx + sx, cy - sy, cz - sz)),
        bm.verts.new((cx + sx, cy + sy, cz - sz)),
        bm.verts.new((cx - sx, cy + sy, cz - sz)),
        bm.verts.new((cx - sx, cy - sy, cz + sz)),
        bm.verts.new((cx + sx, cy - sy, cz + sz)),
        bm.verts.new((cx + sx, cy + sy, cz + sz)),
        bm.verts.new((cx - sx, cy + sy, cz + sz)),
    ]
    faces = [
        (0, 1, 2, 3), # Bottom
        (4, 7, 6, 5), # Top
        (0, 4, 5, 1), # Front
        (2, 6, 7, 3), # Back
        (0, 3, 7, 4), # Left
        (1, 5, 6, 2), # Right
    ]
    created_faces = []
    for f in faces:
        face = bm.faces.new([verts[i] for i in f])
        face.material_index = mat_idx
        created_faces.append(face)
    return verts, created_faces

def add_tapered_box_bmesh(bm, bottom_center, top_center, bottom_size, top_size, mat_idx=0):
    bcx, bcy, bcz = bottom_center
    tcx, tcy, tcz = top_center
    bsx, bsy = bottom_size[0] / 2, bottom_size[1] / 2
    tsx, tsy = top_size[0] / 2, top_size[1] / 2
    verts = [
        bm.verts.new((bcx - bsx, bcy - bsy, bcz)),
        bm.verts.new((bcx + bsx, bcy - bsy, bcz)),
        bm.verts.new((bcx + bsx, bcy + bsy, bcz)),
        bm.verts.new((bcx - bsx, bcy + bsy, bcz)),
        bm.verts.new((tcx - tsx, tcy - tsy, tcz)),
        bm.verts.new((tcx + tsx, tcy - tsy, tcz)),
        bm.verts.new((tcx + tsx, tcy + tsy, tcz)),
        bm.verts.new((tcx - tsx, tcy + tsy, tcz)),
    ]
    faces = [
        (0, 1, 2, 3),
        (4, 7, 6, 5),
        (0, 4, 5, 1),
        (2, 6, 7, 3),
        (0, 3, 7, 4),
        (1, 5, 6, 2),
    ]
    created_faces = []
    for f in faces:
        face = bm.faces.new([verts[i] for i in f])
        face.material_index = mat_idx
        created_faces.append(face)
    return verts, created_faces

# =============================================================================
# 1. ARMATURE SKELETON WITH SOCKETS
# =============================================================================

def build_humanoid_armature() -> bpy.types.Object:
    """
    Constructs the master humanoid armature with standard bone naming
    and non-deforming equipment sockets.
    """
    arm_data = bpy.data.armatures.new("Humanoid_Armature")
    arm_obj = bpy.data.objects.new("Humanoid_Rig", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='EDIT')

    eb = arm_data.edit_bones

    # Core Deform Bones
    root = eb.new("Root")
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.1)

    pelvis = eb.new("Pelvis")
    pelvis.parent = root
    pelvis.head = (0, 0, 0.65)
    pelvis.tail = (0, 0, 0.82)

    spine = eb.new("Spine")
    spine.parent = pelvis
    spine.head = (0, 0, 0.82)
    spine.tail = (0, 0, 1.02)

    chest = eb.new("Chest")
    chest.parent = spine
    chest.head = (0, 0, 1.02)
    chest.tail = (0, 0, 1.25)

    neck = eb.new("Neck")
    neck.parent = chest
    neck.head = (0, 0, 1.25)
    neck.tail = (0, 0, 1.34)

    head = eb.new("Head")
    head.parent = neck
    head.head = (0, 0, 1.34)
    head.tail = (0, 0, 1.66)

    # Left Arm
    sh_l = eb.new("Shoulder.L")
    sh_l.parent = chest
    sh_l.head = (0.10, 0, 1.22)
    sh_l.tail = (0.22, 0, 1.20)

    ua_l = eb.new("UpperArm.L")
    ua_l.parent = sh_l
    ua_l.head = (0.22, 0, 1.20)
    ua_l.tail = (0.32, 0, 0.98)

    fa_l = eb.new("Forearm.L")
    fa_l.parent = ua_l
    fa_l.head = (0.32, 0, 0.98)
    fa_l.tail = (0.38, 0, 0.76)

    hand_l = eb.new("Hand.L")
    hand_l.parent = fa_l
    hand_l.head = (0.38, 0, 0.76)
    hand_l.tail = (0.40, 0, 0.66)

    # Right Arm
    sh_r = eb.new("Shoulder.R")
    sh_r.parent = chest
    sh_r.head = (-0.10, 0, 1.22)
    sh_r.tail = (-0.22, 0, 1.20)

    ua_r = eb.new("UpperArm.R")
    ua_r.parent = sh_r
    ua_r.head = (-0.22, 0, 1.20)
    ua_r.tail = (-0.32, 0, 0.98)

    fa_r = eb.new("Forearm.R")
    fa_r.parent = ua_r
    fa_r.head = (-0.32, 0, 0.98)
    fa_r.tail = (-0.38, 0, 0.76)

    hand_r = eb.new("Hand.R")
    hand_r.parent = fa_r
    hand_r.head = (-0.38, 0, 0.76)
    hand_r.tail = (-0.40, 0, 0.66)

    # Left Leg
    thigh_l = eb.new("Thigh.L")
    thigh_l.parent = pelvis
    thigh_l.head = (0.12, 0, 0.64)
    thigh_l.tail = (0.12, 0, 0.35)

    shin_l = eb.new("Shin.L")
    shin_l.parent = thigh_l
    shin_l.head = (0.12, 0, 0.35)
    shin_l.tail = (0.12, 0, 0.10)

    foot_l = eb.new("Foot.L")
    foot_l.parent = shin_l
    foot_l.head = (0.12, 0, 0.10)
    foot_l.tail = (0.12, -0.14, 0.0)

    # Right Leg
    thigh_r = eb.new("Thigh.R")
    thigh_r.parent = pelvis
    thigh_r.head = (-0.12, 0, 0.64)
    thigh_r.tail = (-0.12, 0, 0.35)

    shin_r = eb.new("Shin.R")
    shin_r.parent = thigh_r
    shin_r.head = (-0.12, 0, 0.35)
    shin_r.tail = (-0.12, 0, 0.10)

    foot_r = eb.new("Foot.R")
    foot_r.parent = shin_r
    foot_r.head = (-0.12, 0, 0.10)
    foot_r.tail = (-0.12, -0.14, 0.0)

    # Sockets for handheld items
    sock_r = eb.new("Socket_Hand.R")
    sock_r.parent = hand_r
    sock_r.head = (-0.38, -0.04, 0.68)
    sock_r.tail = (-0.38, -0.04, 0.78)
    sock_r.use_deform = False

    sock_l = eb.new("Socket_Hand.L")
    sock_l.parent = hand_l
    sock_l.head = (0.38, -0.04, 0.68)
    sock_l.tail = (0.38, -0.04, 0.78)
    sock_l.use_deform = False

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj

# =============================================================================
# 2. BASE MANNEQUIN BODY MESH
# =============================================================================

def build_base_mannequin(arm_obj: bpy.types.Object) -> bpy.types.Object:
    mesh = bpy.data.meshes.new("Mesh_Mannequin_Body")
    body_obj = bpy.data.objects.new("Mannequin_Body", mesh)
    bpy.context.collection.objects.link(body_obj)

    m_skin = create_material("M_Skin_Base", *hex_to_rgb("f4d3b8"))
    mesh.materials.append(m_skin)

    bm = bmesh.new()
    groups: dict[str, list[bmesh.types.BMVert]] = {
        "Head": [], "Neck": [], "Chest": [], "Spine": [], "Pelvis": [],
        "UpperArm.L": [], "Forearm.L": [], "Hand.L": [],
        "UpperArm.R": [], "Forearm.R": [], "Hand.R": [],
        "Thigh.L": [], "Shin.L": [], "Foot.L": [],
        "Thigh.R": [], "Shin.R": [], "Foot.R": [],
    }

    # Head
    v, _ = add_box_bmesh(bm, (0, 0, 1.50), (0.32, 0.30, 0.32), mat_idx=0)
    groups["Head"].extend(v)
    v, _ = add_box_bmesh(bm, (0, -0.16, 1.46), (0.05, 0.04, 0.07), mat_idx=0) # Nose
    groups["Head"].extend(v)

    # Neck
    v, _ = add_tapered_box_bmesh(bm, (0, 0, 1.25), (0, 0, 1.34), (0.14, 0.12), (0.12, 0.10), mat_idx=0)
    groups["Neck"].extend(v)

    # Torso
    v, _ = add_tapered_box_bmesh(bm, (0, 0, 1.02), (0, 0, 1.25), (0.30, 0.20), (0.34, 0.22), mat_idx=0)
    groups["Chest"].extend(v)
    v, _ = add_tapered_box_bmesh(bm, (0, 0, 0.82), (0, 0, 1.02), (0.26, 0.18), (0.30, 0.20), mat_idx=0)
    groups["Spine"].extend(v)
    v, _ = add_tapered_box_bmesh(bm, (0, 0, 0.65), (0, 0, 0.82), (0.28, 0.20), (0.26, 0.18), mat_idx=0)
    groups["Pelvis"].extend(v)

    # Left Arm
    v, _ = add_tapered_box_bmesh(bm, (0.22, 0, 0.98), (0.22, 0, 1.20), (0.09, 0.09), (0.10, 0.10), mat_idx=0)
    groups["UpperArm.L"].extend(v)
    v, _ = add_tapered_box_bmesh(bm, (0.30, 0, 0.76), (0.22, 0, 0.98), (0.08, 0.08), (0.09, 0.09), mat_idx=0)
    groups["Forearm.L"].extend(v)
    v, _ = add_box_bmesh(bm, (0.34, 0, 0.68), (0.07, 0.07, 0.09), mat_idx=0)
    groups["Hand.L"].extend(v)

    # Right Arm
    v, _ = add_tapered_box_bmesh(bm, (-0.22, 0, 0.98), (-0.22, 0, 1.20), (0.09, 0.09), (0.10, 0.10), mat_idx=0)
    groups["UpperArm.R"].extend(v)
    v, _ = add_tapered_box_bmesh(bm, (-0.30, 0, 0.76), (-0.22, 0, 0.98), (0.08, 0.08), (0.09, 0.09), mat_idx=0)
    groups["Forearm.R"].extend(v)
    v, _ = add_box_bmesh(bm, (-0.34, 0, 0.68), (0.07, 0.07, 0.09), mat_idx=0)
    groups["Hand.R"].extend(v)

    # Left Leg
    v, _ = add_tapered_box_bmesh(bm, (0.12, 0, 0.35), (0.12, 0, 0.64), (0.11, 0.11), (0.13, 0.13), mat_idx=0)
    groups["Thigh.L"].extend(v)
    v, _ = add_tapered_box_bmesh(bm, (0.12, 0, 0.08), (0.12, 0, 0.35), (0.09, 0.09), (0.11, 0.11), mat_idx=0)
    groups["Shin.L"].extend(v)
    v, _ = add_box_bmesh(bm, (0.12, -0.05, 0.04), (0.10, 0.18, 0.08), mat_idx=0)
    groups["Foot.L"].extend(v)

    # Right Leg
    v, _ = add_tapered_box_bmesh(bm, (-0.12, 0, 0.35), (-0.12, 0, 0.64), (0.11, 0.11), (0.13, 0.13), mat_idx=0)
    groups["Thigh.R"].extend(v)
    v, _ = add_tapered_box_bmesh(bm, (-0.12, 0, 0.08), (-0.12, 0, 0.35), (0.09, 0.09), (0.11, 0.11), mat_idx=0)
    groups["Shin.R"].extend(v)
    v, _ = add_box_bmesh(bm, (-0.12, -0.05, 0.04), (0.10, 0.18, 0.08), mat_idx=0)
    groups["Foot.R"].extend(v)

    bm.verts.ensure_lookup_table()
    group_indices = {bone_name: [v.index for v in vert_list] for bone_name, vert_list in groups.items()}
    bm.to_mesh(mesh)
    bm.free()

    for bone_name, indices in group_indices.items():
        if indices:
            vg = body_obj.vertex_groups.new(name=bone_name)
            vg.add(indices, 1.0, 'REPLACE')

    mod = body_obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = arm_obj
    body_obj.parent = arm_obj
    return body_obj

# =============================================================================
# 3. MODULAR ATTACHMENTS (HAIR, OUTFITS, TOOLS)
# =============================================================================

def build_modular_assets(arm_obj: bpy.types.Object):
    col_hair = bpy.data.collections.new("Col_Hair")
    col_outfits = bpy.data.collections.new("Col_Outfits")
    col_tools = bpy.data.collections.new("Col_Tools")
    bpy.context.scene.collection.children.link(col_hair)
    bpy.context.scene.collection.children.link(col_outfits)
    bpy.context.scene.collection.children.link(col_tools)

    m_hair_teal = create_material("M_Hair_Teal", *hex_to_rgb("235c59"))
    m_hair_hi = create_material("M_Hair_Highlight", *hex_to_rgb("449994"))
    m_hair_dark = create_material("M_Hair_Dark", *hex_to_rgb("252422"))
    m_hair_brown = create_material("M_Hair_Brown", *hex_to_rgb("4e3524"))
    m_hair_auburn = create_material("M_Hair_Auburn", *hex_to_rgb("6d3922"))
    m_hair_blonde = create_material("M_Hair_Blonde", *hex_to_rgb("c89f5c"))
    m_hair_grey = create_material("M_Hair_Grey", *hex_to_rgb("636260"))
    m_gold = create_material("M_Gold_Trim", *hex_to_rgb("e8be48"))
    m_wood = create_material("M_Wood_Timber", *hex_to_rgb("6b482b"))
    m_iron = create_material("M_Iron_Metal", *hex_to_rgb("7a828a"))
    m_cloth_white = create_material("M_Cloth_White", *hex_to_rgb("ede4d1"))
    m_cloth_blue = create_material("M_Cloth_Blue", *hex_to_rgb("375b70"))
    m_cloth_teal = create_material("M_Cloth_Teal", *hex_to_rgb("2c7371"))
    m_leather_dark = create_material("M_Leather_Dark", *hex_to_rgb("422e20"))
    m_cyan_gem = create_material("M_Cyan_Glow", *hex_to_rgb("4ae3e8"))

    # Helper: Hair Mesh (Skinned to Head bone)
    def create_hair_mesh(name, mat_list, build_fn):
        mesh = bpy.data.meshes.new(f"Mesh_{name}")
        obj = bpy.data.objects.new(name, mesh)
        col_hair.objects.link(obj)
        add_materials(mesh, mat_list)
        bm = bmesh.new()
        build_fn(bm)
        bm.verts.ensure_lookup_table()
        all_indices = [v.index for v in bm.verts]
        bm.to_mesh(mesh)
        bm.free()
        vg = obj.vertex_groups.new(name="Head")
        vg.add(all_indices, 1.0, 'REPLACE')
        mod = obj.modifiers.new(name="Armature", type='ARMATURE')
        mod.object = arm_obj
        obj.parent = arm_obj
        return obj

    # Helper: Outfit Mesh (Skinned to Chest/Spine/Pelvis bones)
    def create_outfit_mesh(name, mat_list, build_fn):
        mesh = bpy.data.meshes.new(f"Mesh_{name}")
        obj = bpy.data.objects.new(name, mesh)
        col_outfits.objects.link(obj)
        add_materials(mesh, mat_list)
        bm = bmesh.new()
        groups = {"Chest": [], "Spine": [], "Pelvis": []}
        build_fn(bm, groups)
        bm.verts.ensure_lookup_table()
        group_indices = {b_name: [v.index for v in v_list] for b_name, v_list in groups.items()}
        bm.to_mesh(mesh)
        bm.free()
        for b_name, indices in group_indices.items():
            if indices:
                vg = obj.vertex_groups.new(name=b_name)
                vg.add(indices, 1.0, 'REPLACE')
        mod = obj.modifiers.new(name="Armature", type='ARMATURE')
        mod.object = arm_obj
        obj.parent = arm_obj
        return obj

    # Helper: Tool Mesh (Attached to Socket_Hand.R)
    def create_tool_mesh(name, mat_list, build_fn):
        mesh = bpy.data.meshes.new(f"Mesh_{name}")
        obj = bpy.data.objects.new(name, mesh)
        col_tools.objects.link(obj)
        add_materials(mesh, mat_list)
        bm = bmesh.new()
        build_fn(bm)
        bm.to_mesh(mesh)
        bm.free()
        obj.parent = arm_obj
        obj.parent_type = 'BONE'
        obj.parent_bone = "Socket_Hand.R"
        return obj

    # -------------------------------------------------------------------------
    # A. HAIRSTYLES (9 variants)
    # -------------------------------------------------------------------------
    def b_hair_aq(bm):
        add_box_bmesh(bm, (0, 0.02, 1.56), (0.36, 0.34, 0.26), mat_idx=0)
        add_box_bmesh(bm, (0, -0.15, 1.58), (0.32, 0.07, 0.14), mat_idx=1)
        add_box_bmesh(bm, (0.17, -0.05, 1.46), (0.05, 0.11, 0.22), mat_idx=0)
        add_box_bmesh(bm, (-0.17, -0.05, 1.46), (0.05, 0.11, 0.22), mat_idx=0)
        add_box_bmesh(bm, (0, 0.18, 1.40), (0.14, 0.12, 0.28), mat_idx=0)
        add_box_bmesh(bm, (0.15, -0.08, 1.62), (0.05, 0.05, 0.05), mat_idx=2)
    create_hair_mesh("Hair_Aqualia", [m_hair_teal, m_hair_hi, m_gold], b_hair_aq)

    def b_hair_ne(bm):
        add_box_bmesh(bm, (0, 0.02, 1.55), (0.35, 0.33, 0.22), mat_idx=0)
        add_box_bmesh(bm, (0, -0.01, 1.57), (0.37, 0.35, 0.07), mat_idx=1)
    create_hair_mesh("Hair_Neris", [m_hair_dark, create_material("M_Band_Orange", *hex_to_rgb("c96838"))], b_hair_ne)

    def b_hair_re(bm):
        add_box_bmesh(bm, (0, 0.02, 1.55), (0.34, 0.32, 0.22), mat_idx=0)
        add_box_bmesh(bm, (0, 0.06, 1.70), (0.10, 0.10, 0.14), mat_idx=0)
    create_hair_mesh("Hair_Reed", [m_hair_brown], b_hair_re)

    def b_hair_wi(bm):
        add_box_bmesh(bm, (0, 0.03, 1.56), (0.36, 0.34, 0.22), mat_idx=1)
        add_box_bmesh(bm, (0, 0.16, 1.52), (0.12, 0.12, 0.14), mat_idx=0)
    create_hair_mesh("Hair_Willa", [m_hair_auburn, m_cloth_white], b_hair_wi)

    def b_hair_or(bm):
        add_box_bmesh(bm, (0, 0.02, 1.55), (0.35, 0.34, 0.24), mat_idx=0)
        add_box_bmesh(bm, (0.17, 0.02, 1.38), (0.05, 0.18, 0.24), mat_idx=0)
        add_box_bmesh(bm, (-0.17, 0.02, 1.38), (0.05, 0.18, 0.24), mat_idx=0)
    create_hair_mesh("Hair_Oren", [m_hair_dark], b_hair_or)

    def b_hair_la(bm):
        add_box_bmesh(bm, (0, 0.02, 1.54), (0.34, 0.32, 0.20), mat_idx=0)
        add_box_bmesh(bm, (0, -0.03, 1.64), (0.38, 0.38, 0.08), mat_idx=1)
        add_box_bmesh(bm, (0.16, 0.02, 1.68), (0.02, 0.08, 0.10), mat_idx=2)
    create_hair_mesh("Hair_Lark", [m_hair_blonde, m_cloth_blue, m_cyan_gem], b_hair_la)

    def b_hair_da(bm):
        add_box_bmesh(bm, (0, 0.02, 1.55), (0.35, 0.34, 0.24), mat_idx=0)
        add_box_bmesh(bm, (0.16, -0.03, 1.28), (0.06, 0.06, 0.36), mat_idx=0)
        add_box_bmesh(bm, (-0.16, -0.03, 1.28), (0.06, 0.06, 0.36), mat_idx=0)
    create_hair_mesh("Hair_Dara", [m_hair_auburn, m_cyan_gem], b_hair_da)

    def b_hair_fi(bm):
        add_box_bmesh(bm, (0, 0.02, 1.54), (0.34, 0.32, 0.20), mat_idx=0)
        add_box_bmesh(bm, (0, -0.02, 1.57), (0.36, 0.34, 0.05), mat_idx=1)
    create_hair_mesh("Hair_Finn", [m_hair_blonde, m_leather_dark], b_hair_fi)

    def b_hair_vu(bm):
        add_box_bmesh(bm, (0, 0.06, 1.50), (0.35, 0.22, 0.16), mat_idx=0)
        add_box_bmesh(bm, (0, -0.14, 1.36), (0.24, 0.14, 0.22), mat_idx=0)
    create_hair_mesh("Hair_Vulkan", [m_hair_grey], b_hair_vu)

    # -------------------------------------------------------------------------
    # B. OUTFITS (9 variants - Skinned to Armature)
    # -------------------------------------------------------------------------
    def b_out_aq(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.98), (0, 0, 1.26), (0.38, 0.26), (0.36, 0.24), mat_idx=0)
        grp["Chest"].extend(v1)
        v2, _ = add_tapered_box_bmesh(bm, (0, 0, 0.62), (0, 0, 0.98), (0.32, 0.22), (0.30, 0.20), mat_idx=1)
        grp["Pelvis"].extend(v2)
    create_outfit_mesh("Outfit_Aqualia", [m_cloth_teal, m_cloth_white], b_out_aq)

    def b_out_ne(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.64), (0, 0, 1.24), (0.34, 0.24), (0.34, 0.22), mat_idx=0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, -0.13, 0.88), (0.22, 0.03, 0.38), mat_idx=1)
        grp["Spine"].extend(v2)
    create_outfit_mesh("Outfit_Fishmonger", [m_cloth_blue, m_leather_dark], b_out_ne)

    def b_out_re(bm, grp):
        v, _ = add_tapered_box_bmesh(bm, (0, 0, 0.64), (0, 0, 1.24), (0.32, 0.22), (0.32, 0.20), mat_idx=0)
        grp["Chest"].extend(v)
    create_outfit_mesh("Outfit_Reedweaver", [create_material("M_Reed_Fiber", *hex_to_rgb("8c845b"))], b_out_re)

    def b_out_wi(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.62), (0, 0, 1.24), (0.32, 0.22), (0.32, 0.20), mat_idx=0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, -0.12, 0.88), (0.24, 0.03, 0.44), mat_idx=1)
        grp["Spine"].extend(v2)
    create_outfit_mesh("Outfit_Cook", [m_cloth_teal, m_cloth_white], b_out_wi)

    def b_out_or(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.68), (0, 0, 1.25), (0.36, 0.24), (0.36, 0.22), mat_idx=0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0.20, 0, 1.22), (0.10, 0.14, 0.06), mat_idx=1)
        v3, _ = add_box_bmesh(bm, (-0.20, 0, 1.22), (0.10, 0.14, 0.06), mat_idx=1)
        grp["Chest"].extend(v2 + v3)
    create_outfit_mesh("Outfit_Stonemason", [m_leather_dark, m_iron], b_out_or)

    def b_out_la(bm, grp):
        v, _ = add_tapered_box_bmesh(bm, (0, 0, 0.64), (0, 0, 1.25), (0.36, 0.24), (0.34, 0.22), mat_idx=0)
        grp["Chest"].extend(v)
    create_outfit_mesh("Outfit_Ferryman", [m_cloth_blue], b_out_la)

    def b_out_da(bm, grp):
        v, _ = add_tapered_box_bmesh(bm, (0, 0, 0.58), (0, 0, 1.25), (0.38, 0.24), (0.34, 0.22), mat_idx=0)
        grp["Chest"].extend(v)
    create_outfit_mesh("Outfit_Waterkeeper", [m_cloth_white], b_out_da)

    def b_out_fi(bm, grp):
        v, _ = add_tapered_box_bmesh(bm, (0, 0, 0.66), (0, 0, 1.24), (0.32, 0.22), (0.32, 0.20), mat_idx=0)
        grp["Chest"].extend(v)
    create_outfit_mesh("Outfit_Scout", [create_material("M_Leather_Green", *hex_to_rgb("3b543b"))], b_out_fi)

    def b_out_vu(bm, grp):
        v, _ = add_tapered_box_bmesh(bm, (0, 0, 0.62), (0, 0, 1.24), (0.38, 0.26), (0.36, 0.24), mat_idx=0)
        grp["Chest"].extend(v)
    create_outfit_mesh("Outfit_Blacksmith", [create_material("M_Apron_Heavy", *hex_to_rgb("3d2a1d"))], b_out_vu)

    # -------------------------------------------------------------------------
    # C. TOOLS (Handhelds - Relative to Hand Socket)
    # -------------------------------------------------------------------------
    def b_t_net(bm):
        add_box_bmesh(bm, (0, 0, 0.0), (0.03, 0.03, 0.24), mat_idx=0)
        add_box_bmesh(bm, (0, -0.06, 0.12), (0.14, 0.12, 0.03), mat_idx=0)
        add_box_bmesh(bm, (0, -0.06, 0.05), (0.11, 0.09, 0.12), mat_idx=1)
    create_tool_mesh("Tool_FishingNet", [m_wood, create_material("M_Rope_Net", *hex_to_rgb("c4b28d"))], b_t_net)

    def b_t_reed(bm):
        add_box_bmesh(bm, (0, -0.03, 0.06), (0.08, 0.09, 0.24), mat_idx=0)
    create_tool_mesh("Tool_ReedBundle", [create_material("M_Green_Reeds", *hex_to_rgb("52734a"))], b_t_reed)

    def b_t_ladle(bm):
        add_box_bmesh(bm, (0, 0, 0.04), (0.02, 0.02, 0.20), mat_idx=0)
        add_box_bmesh(bm, (0, -0.02, 0.14), (0.06, 0.06, 0.04), mat_idx=0)
    create_tool_mesh("Tool_CookingLadle", [m_wood], b_t_ladle)

    def b_t_chisel(bm):
        add_box_bmesh(bm, (0, 0, 0.04), (0.03, 0.03, 0.18), mat_idx=0)
        add_box_bmesh(bm, (0, 0, 0.14), (0.02, 0.02, 0.06), mat_idx=1)
    create_tool_mesh("Tool_RuneChisel", [m_wood, m_iron], b_t_chisel)

    def b_t_oar(bm):
        add_box_bmesh(bm, (0, 0, 0.06), (0.03, 0.03, 0.34), mat_idx=0)
        add_box_bmesh(bm, (0, 0, 0.22), (0.10, 0.02, 0.14), mat_idx=0)
    create_tool_mesh("Tool_FerryOar", [m_wood], b_t_oar)

    def b_t_vial(bm):
        add_box_bmesh(bm, (0, -0.02, 0.04), (0.04, 0.04, 0.10), mat_idx=0)
    create_tool_mesh("Tool_WaterPhial", [m_cyan_gem], b_t_vial)

    def b_t_staff(bm):
        add_box_bmesh(bm, (0, 0, 0.06), (0.03, 0.03, 0.36), mat_idx=0)
    create_tool_mesh("Tool_ScoutStaff", [m_wood], b_t_staff)

    def b_t_ham(bm):
        add_box_bmesh(bm, (0, 0, 0.06), (0.03, 0.03, 0.22), mat_idx=0)
        add_box_bmesh(bm, (0, 0, 0.16), (0.11, 0.08, 0.08), mat_idx=1)
    create_tool_mesh("Tool_ForgeHammer", [m_wood, m_iron], b_t_ham)

# =============================================================================
# 4. PROCEDURAL ANIMATION ACTIONS (IDLE BREATHING & WALK)
# =============================================================================

def setup_humanoid_animations(arm_obj: bpy.types.Object):
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()

    # 1. Idle Breathing (6 frames: 0..5)
    act_idle = bpy.data.actions.new(name="idle_breathing")
    arm_obj.animation_data.action = act_idle

    bones = arm_obj.pose.bones
    chest_z_rot = [0.0, 0.012, 0.022, 0.016, 0.006, 0.0]
    pelvis_z_shift = [0.65, 0.653, 0.658, 0.655, 0.652, 0.65]

    for f_idx in range(6):
        bpy.context.scene.frame_set(f_idx)
        bones["Pelvis"].location = (0, 0, pelvis_z_shift[f_idx] - 0.65)
        bones["Pelvis"].keyframe_insert(data_path="location", frame=f_idx)

        bones["Chest"].rotation_euler = (chest_z_rot[f_idx], 0, 0)
        bones["Chest"].keyframe_insert(data_path="rotation_euler", frame=f_idx)

    # 2. Walk Cycle (8 frames)
    act_walk = bpy.data.actions.new(name="walk")
    arm_obj.animation_data.action = act_walk

    thigh_l_rot = [0.28, 0.14, -0.08, -0.25, -0.28, -0.14, 0.08, 0.25]
    thigh_r_rot = [-0.28, -0.14, 0.08, 0.25, 0.28, 0.14, -0.08, -0.25]
    arm_l_rot = [-0.20, -0.10, 0.06, 0.18, 0.20, 0.10, -0.06, -0.18]
    arm_r_rot = [0.20, 0.10, -0.06, -0.18, -0.20, -0.10, 0.06, 0.18]
    pelvis_bounce = [0.0, 0.010, 0.0, -0.006, 0.0, 0.010, 0.0, -0.006]

    for f_idx in range(8):
        bpy.context.scene.frame_set(f_idx)
        bones["Pelvis"].location = (0, 0, pelvis_bounce[f_idx])
        bones["Pelvis"].keyframe_insert(data_path="location", frame=f_idx)

        bones["Thigh.L"].rotation_euler = (thigh_l_rot[f_idx], 0, 0)
        bones["Thigh.L"].keyframe_insert(data_path="rotation_euler", frame=f_idx)

        bones["Thigh.R"].rotation_euler = (thigh_r_rot[f_idx], 0, 0)
        bones["Thigh.R"].keyframe_insert(data_path="rotation_euler", frame=f_idx)

        bones["UpperArm.L"].rotation_euler = (arm_l_rot[f_idx], 0, 0)
        bones["UpperArm.L"].keyframe_insert(data_path="rotation_euler", frame=f_idx)

        bones["UpperArm.R"].rotation_euler = (arm_r_rot[f_idx], 0, 0)
        bones["UpperArm.R"].keyframe_insert(data_path="rotation_euler", frame=f_idx)

    arm_obj.animation_data.action = act_idle
    bpy.context.scene.frame_set(0)

# =============================================================================
# MAIN BUILD SCRIPT
# =============================================================================

def main():
    print("=" * 60)
    print("Building Precision Modular Humanoid Base in Blender 4.2...")
    print("=" * 60)

    reset_scene()

    arm_obj = build_humanoid_armature()
    print("  [1/4] Master Humanoid Armature built (bones & non-deform sockets).")

    mannequin_obj = build_base_mannequin(arm_obj)
    print("  [2/4] Base Mannequin Mesh modeled, rigged, and vertex-weighted.")

    build_modular_assets(arm_obj)
    print("  [3/4] Modular attachments library generated (9 hairstyles, 9 outfits, 8 tools).")

    setup_humanoid_animations(arm_obj)
    print("  [4/4] Procedural keyframe animations added (idle_breathing & walk).")

    bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
    print(f"Master Modular Humanoid saved: {OUT_BLEND}")
    print("=" * 60)

if __name__ == "__main__":
    main()
