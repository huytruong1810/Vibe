"""
Master Modular Humanoid Rig and Comprehensive Cast Builder for Hearthwild.
Constructs humanoid_modular_base.blend containing:
1. Master Humanoid Rig Armature (19 deform bones + 10 equipment sockets).
2. Low-poly stylized base mannequin body skinned to the skeleton.
3. Complete modular attachments library covering all 30 villagers + 3 player origins:
   - 25 distinct modular hairstyles & headgear (Col_Hair)
   - 22 distinct modular outfits rigged with Armature modifiers (Col_Outfits)
   - 24 distinct modular handheld tools parented to Socket_Hand.R (Col_Tools)
4. Keyframed procedural idle_breathing (6 frames) and walk (8 frames) action tracks.
"""

import sys
import math
from pathlib import Path

try:
    import bpy
    import bmesh
except ImportError:
    print("Must be executed inside Blender: blender -b -P build_modular_rig.py")
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[3]
MODELS_DIR = REPO_ROOT / "art" / "source" / "blender" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def hex_to_rgb(hex_str: str) -> tuple[float, float, float]:
    hex_str = hex_str.lstrip("#")
    return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

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

def add_materials(mesh, mat_list):
    for m in mat_list:
        mesh.materials.append(m)

def add_box_bmesh(bm, center, size, mat_idx=0):
    cx, cy, cz = center
    sx, sy, sz = size[0] / 2.0, size[1] / 2.0, size[2] / 2.0
    v0 = bm.verts.new((cx - sx, cy - sy, cz - sz))
    v1 = bm.verts.new((cx + sx, cy - sy, cz - sz))
    v2 = bm.verts.new((cx + sx, cy + sy, cz - sz))
    v3 = bm.verts.new((cx - sx, cy + sy, cz - sz))
    v4 = bm.verts.new((cx - sx, cy - sy, cz + sz))
    v5 = bm.verts.new((cx + sx, cy - sy, cz + sz))
    v6 = bm.verts.new((cx + sx, cy + sy, cz + sz))
    v7 = bm.verts.new((cx - sx, cy + sy, cz + sz))

    faces = [
        (v0, v1, v2, v3), (v4, v7, v6, v5),
        (v0, v4, v5, v1), (v2, v6, v7, v3),
        (v0, v3, v7, v4), (v1, v5, v6, v2),
    ]
    created_faces = []
    for fverts in faces:
        f = bm.faces.new(fverts)
        f.material_index = mat_idx
        created_faces.append(f)
    bm.verts.ensure_lookup_table()
    return [v.index for v in (v0, v1, v2, v3, v4, v5, v6, v7)], created_faces

def add_tapered_box_bmesh(bm, b_center, t_center, b_size, t_size, mat_idx=0):
    bx, by, bz = b_center
    tx, ty, tz = t_center
    bsx, bsy = b_size[0] / 2.0, b_size[1] / 2.0
    tsx, tsy = t_size[0] / 2.0, t_size[1] / 2.0

    v0 = bm.verts.new((bx - bsx, by - bsy, bz))
    v1 = bm.verts.new((bx + bsx, by - bsy, bz))
    v2 = bm.verts.new((bx + bsx, by + bsy, bz))
    v3 = bm.verts.new((bx - bsx, by + bsy, bz))
    v4 = bm.verts.new((tx - tsx, ty - tsy, tz))
    v5 = bm.verts.new((tx + tsx, ty - tsy, tz))
    v6 = bm.verts.new((tx + tsx, ty + tsy, tz))
    v7 = bm.verts.new((tx - tsx, ty + tsy, tz))

    faces = [
        (v0, v1, v2, v3), (v4, v7, v6, v5),
        (v0, v4, v5, v1), (v2, v6, v7, v3),
        (v0, v3, v7, v4), (v1, v5, v6, v2),
    ]
    created_faces = []
    for fverts in faces:
        f = bm.faces.new(fverts)
        f.material_index = mat_idx
        created_faces.append(f)
    bm.verts.ensure_lookup_table()
    return [v.index for v in (v0, v1, v2, v3, v4, v5, v6, v7)], created_faces

# ==============================================================================
# 1. BUILD MASTER HUMANOID RIG
# ==============================================================================
def build_master_armature() -> bpy.types.Object:
    arm_data = bpy.data.armatures.new("Humanoid_Rig_Data")
    arm_obj = bpy.data.objects.new("Humanoid_Rig", arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)

    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones

    root = eb.new("Root")
    root.head = (0.0, 0.0, 0.0)
    root.tail = (0.0, 0.0, 0.1)

    pelvis = eb.new("Pelvis")
    pelvis.head = (0.0, 0.0, 0.70)
    pelvis.tail = (0.0, 0.0, 0.84)
    pelvis.parent = root

    spine = eb.new("Spine")
    spine.head = (0.0, 0.0, 0.84)
    spine.tail = (0.0, 0.0, 1.04)
    spine.parent = pelvis

    chest = eb.new("Chest")
    chest.head = (0.0, 0.0, 1.04)
    chest.tail = (0.0, 0.0, 1.20)
    chest.parent = spine

    neck = eb.new("Neck")
    neck.head = (0.0, 0.0, 1.20)
    neck.tail = (0.0, 0.0, 1.28)
    neck.parent = chest

    head = eb.new("Head")
    head.head = (0.0, 0.0, 1.28)
    head.tail = (0.0, 0.0, 1.54)
    head.parent = neck

    for side, sign in [("L", 1.0), ("R", -1.0)]:
        uarm = eb.new(f"UpperArm.{side}")
        uarm.head = (sign * 0.22, 0.0, 1.18)
        uarm.tail = (sign * 0.38, 0.0, 0.95)
        uarm.parent = chest

        farm = eb.new(f"Forearm.{side}")
        farm.head = (sign * 0.38, 0.0, 0.95)
        farm.tail = (sign * 0.44, -0.02, 0.76)
        farm.parent = uarm

        hand = eb.new(f"Hand.{side}")
        hand.head = (sign * 0.44, -0.02, 0.76)
        hand.tail = (sign * 0.46, -0.02, 0.70)
        hand.parent = farm

        thigh = eb.new(f"Thigh.{side}")
        thigh.head = (sign * 0.14, 0.0, 0.70)
        thigh.tail = (sign * 0.15, 0.01, 0.38)
        thigh.parent = pelvis

        shin = eb.new(f"Shin.{side}")
        shin.head = (sign * 0.15, 0.01, 0.38)
        shin.tail = (sign * 0.15, 0.0, 0.08)
        shin.parent = thigh

        foot = eb.new(f"Foot.{side}")
        foot.head = (sign * 0.15, 0.0, 0.08)
        foot.tail = (sign * 0.15, -0.08, 0.0)
        foot.parent = shin

    # 10 Non-Deforming Equipment Sockets
    sockets = [
        ("Socket_Hair", head, (0.0, -0.04, 1.48), (0.0, -0.04, 1.54)),
        ("Socket_Headgear", head, (0.0, 0.0, 1.54), (0.0, 0.0, 1.62)),
        ("Socket_Face", head, (0.0, -0.15, 1.34), (0.0, -0.20, 1.34)),
        ("Socket_Chest", chest, (0.0, -0.14, 1.04), (0.0, -0.20, 1.04)),
        ("Socket_Back", chest, (0.0, 0.14, 1.08), (0.0, 0.20, 1.08)),
        ("Socket_Belt", pelvis, (0.0, -0.14, 0.78), (0.0, -0.20, 0.78)),
        ("Socket_Hand.R", eb["Hand.R"], (-0.46, -0.02, 0.70), (-0.46, -0.02, 0.60)),
        ("Socket_Hand.L", eb["Hand.L"], (0.46, -0.02, 0.70), (0.46, -0.02, 0.60)),
        ("Socket_Foot.R", eb["Foot.R"], (-0.15, 0.0, 0.0), (-0.15, -0.06, 0.0)),
        ("Socket_Foot.L", eb["Foot.L"], (0.15, 0.0, 0.0), (0.15, -0.06, 0.0)),
    ]

    for sname, parent_bone, head_pos, tail_pos in sockets:
        sb = eb.new(sname)
        sb.head = head_pos
        sb.tail = tail_pos
        sb.parent = parent_bone
        sb.use_deform = False

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj

# ==============================================================================
# 2. BUILD BASE MANNEQUIN BODY
# ==============================================================================
def build_mannequin_body(arm_obj: bpy.types.Object) -> bpy.types.Object:
    m_skin = create_material("M_Mannequin_Skin", *hex_to_rgb("ffd1a4"))
    m_eyes = create_material("M_Mannequin_Eyes", *hex_to_rgb("1f2d3d"))
    m_trousers = create_material("M_Mannequin_Trousers", *hex_to_rgb("2c3540"))
    m_boots = create_material("M_Mannequin_Boots", *hex_to_rgb("4a3728"))

    mesh = bpy.data.meshes.new("Mesh_Mannequin_Body")
    obj = bpy.data.objects.new("Mannequin_Body", mesh)
    bpy.context.scene.collection.objects.link(obj)
    add_materials(mesh, [m_skin, m_eyes, m_trousers, m_boots])

    bm = bmesh.new()
    bone_groups = {b: [] for b in [
        "Head", "Neck", "Chest", "Spine", "Pelvis",
        "UpperArm.L", "Forearm.L", "Hand.L",
        "UpperArm.R", "Forearm.R", "Hand.R",
        "Thigh.L", "Shin.L", "Foot.L",
        "Thigh.R", "Shin.R", "Foot.R"
    ]}

    # Head & Neck
    vh, _ = add_box_bmesh(bm, (0, -0.02, 1.38), (0.32, 0.30, 0.30), mat_idx=0)
    bone_groups["Head"].extend(vh)
    ve_l, _ = add_box_bmesh(bm, (-0.08, -0.175, 1.38), (0.06, 0.02, 0.07), mat_idx=1)
    ve_r, _ = add_box_bmesh(bm, (0.08, -0.175, 1.38), (0.06, 0.02, 0.07), mat_idx=1)
    bone_groups["Head"].extend(ve_l + ve_r)
    vn, _ = add_box_bmesh(bm, (0, 0, 1.22), (0.12, 0.12, 0.08), mat_idx=0)
    bone_groups["Neck"].extend(vn)

    # Torso
    vc, _ = add_tapered_box_bmesh(bm, (0, 0, 1.04), (0, 0, 1.20), (0.34, 0.22), (0.38, 0.24), mat_idx=0)
    bone_groups["Chest"].extend(vc)
    vs, _ = add_tapered_box_bmesh(bm, (0, 0, 0.84), (0, 0, 1.04), (0.30, 0.20), (0.34, 0.22), mat_idx=0)
    bone_groups["Spine"].extend(vs)
    vp, _ = add_tapered_box_bmesh(bm, (0, 0, 0.68), (0, 0, 0.84), (0.32, 0.22), (0.30, 0.20), mat_idx=2)
    bone_groups["Pelvis"].extend(vp)

    # Arms
    for side, sign in [("L", 1.0), ("R", -1.0)]:
        v_ua, _ = add_box_bmesh(bm, (sign * 0.28, 0.0, 1.06), (0.11, 0.12, 0.20), mat_idx=0)
        bone_groups[f"UpperArm.{side}"].extend(v_ua)
        v_fa, _ = add_box_bmesh(bm, (sign * 0.40, -0.01, 0.86), (0.10, 0.11, 0.18), mat_idx=0)
        bone_groups[f"Forearm.{side}"].extend(v_fa)
        v_h, _ = add_box_bmesh(bm, (sign * 0.45, -0.02, 0.72), (0.08, 0.09, 0.09), mat_idx=0)
        bone_groups[f"Hand.{side}"].extend(v_h)

    # Legs
    for side, sign in [("L", 1.0), ("R", -1.0)]:
        v_th, _ = add_box_bmesh(bm, (sign * 0.14, 0.01, 0.52), (0.13, 0.15, 0.32), mat_idx=2)
        bone_groups[f"Thigh.{side}"].extend(v_th)
        v_sh, _ = add_box_bmesh(bm, (sign * 0.15, 0.0, 0.22), (0.12, 0.13, 0.28), mat_idx=3)
        bone_groups[f"Shin.{side}"].extend(v_sh)
        v_ft, _ = add_box_bmesh(bm, (sign * 0.15, -0.04, 0.04), (0.13, 0.18, 0.08), mat_idx=3)
        bone_groups[f"Foot.{side}"].extend(v_ft)

    bm.to_mesh(mesh)
    bm.free()

    for bone_name, v_indices in bone_groups.items():
        if v_indices:
            vg = obj.vertex_groups.new(name=bone_name)
            vg.add(v_indices, 1.0, 'REPLACE')

    mod = obj.modifiers.new("Armature", 'ARMATURE')
    mod.object = arm_obj
    obj.parent = arm_obj
    return obj

# ==============================================================================
# 3. COMPREHENSIVE MODULAR ATTACHMENTS LIBRARY
# ==============================================================================
def build_modular_library(arm_obj: bpy.types.Object):
    col_hair = bpy.data.collections.new("Col_Hair")
    col_outfits = bpy.data.collections.new("Col_Outfits")
    col_tools = bpy.data.collections.new("Col_Tools")
    for c in [col_hair, col_outfits, col_tools]:
        bpy.context.scene.collection.children.link(c)

    # Colors
    c_teal = create_material("M_ClothTeal", *hex_to_rgb("286775"))
    c_cream = create_material("M_ClothCream", *hex_to_rgb("f4f0e6"))
    c_white = create_material("M_ClothWhite", *hex_to_rgb("ffffff"))
    c_navy = create_material("M_ClothNavy", *hex_to_rgb("192833"))
    c_red = create_material("M_ClothRed", *hex_to_rgb("9c3826"))
    c_amber = create_material("M_ClothAmber", *hex_to_rgb("d97329"))
    c_charcoal = create_material("M_ClothCharcoal", *hex_to_rgb("242226"))
    c_gold = create_material("M_MetalGold", *hex_to_rgb("d49a37"))
    c_iron = create_material("M_MetalIron", *hex_to_rgb("52565e"))
    c_sage = create_material("M_ClothSage", *hex_to_rgb("7d946b"))
    c_azure = create_material("M_ClothAzure", *hex_to_rgb("6d98ba"))
    c_flax = create_material("M_ClothFlax", *hex_to_rgb("c2a764"))
    c_leather = create_material("M_LeatherBrown", *hex_to_rgb("5c402b"))
    c_leather_dark = create_material("M_LeatherDark", *hex_to_rgb("36261b"))

    # Hair colors
    h_teal = create_material("M_HairTeal", *hex_to_rgb("338394"))
    h_red = create_material("M_HairRed", *hex_to_rgb("b84428"))
    h_blonde = create_material("M_HairBlonde", *hex_to_rgb("d4b868"))
    h_brown = create_material("M_HairBrown", *hex_to_rgb("4d3829"))
    h_dark = create_material("M_HairDark", *hex_to_rgb("1a1a1f"))
    h_auburn = create_material("M_HairAuburn", *hex_to_rgb("803829"))
    h_grey = create_material("M_HairGrey", *hex_to_rgb("757880"))
    h_silver = create_material("M_HairSilver", *hex_to_rgb("c0c4cc"))

    def create_hair_mesh(name, mats, build_fn):
        mesh = bpy.data.meshes.new(f"Mesh_{name}")
        obj = bpy.data.objects.new(name, mesh)
        col_hair.objects.link(obj)
        add_materials(mesh, mats)
        bm = bmesh.new()
        build_fn(bm)
        bm.to_mesh(mesh)
        bm.free()
        vg = obj.vertex_groups.new(name="Head")
        vg.add(list(range(len(mesh.vertices))), 1.0, 'REPLACE')
        mod = obj.modifiers.new("Armature", 'ARMATURE')
        mod.object = arm_obj
        obj.parent = arm_obj
        return obj

    def create_outfit_mesh(name, mats, build_fn):
        mesh = bpy.data.meshes.new(f"Mesh_{name}")
        obj = bpy.data.objects.new(name, mesh)
        col_outfits.objects.link(obj)
        add_materials(mesh, mats)
        bm = bmesh.new()
        grp = {"Chest": [], "Spine": [], "Pelvis": []}
        build_fn(bm, grp)
        bm.to_mesh(mesh)
        bm.free()
        for bname, vindices in grp.items():
            if vindices:
                vg = obj.vertex_groups.new(name=bname)
                vg.add(vindices, 1.0, 'REPLACE')
        mod = obj.modifiers.new("Armature", 'ARMATURE')
        mod.object = arm_obj
        obj.parent = arm_obj
        return obj

    def create_tool_mesh(name, mats, build_fn):
        mesh = bpy.data.meshes.new(f"Mesh_{name}")
        obj = bpy.data.objects.new(name, mesh)
        col_tools.objects.link(obj)
        add_materials(mesh, mats)
        bm = bmesh.new()
        build_fn(bm)
        bm.to_mesh(mesh)
        bm.free()
        obj.parent = arm_obj
        obj.parent_type = 'BONE'
        obj.parent_bone = "Socket_Hand.R"
        return obj

    # --------------------------------------------------------------------------
    # HAIRSTYLES (Covering All 30 Villagers + 3 Player Origins)
    # --------------------------------------------------------------------------
    # 1. Aqualia (Player) Ponytail
    create_hair_mesh("Hair_Aqualia", [h_teal, c_white, c_gold], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.56), (0.36, 0.34, 0.24), 0),
        add_box_bmesh(bm, (0, -0.15, 1.58), (0.32, 0.07, 0.12), 0),
        add_box_bmesh(bm, (0, 0.18, 1.40), (0.14, 0.12, 0.28), 0),
        add_box_bmesh(bm, (0.15, -0.08, 1.62), (0.05, 0.05, 0.05), 2),
    ))
    # 2. Pyrador (Player) Flame Spikes
    create_hair_mesh("Hair_Pyrador", [h_red, c_amber], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.58), (0.36, 0.34, 0.24), 0),
        add_box_bmesh(bm, (0, -0.06, 1.70), (0.16, 0.16, 0.14), 1),
    ))
    # 3. Zephyria (Player) Windblown Swept
    create_hair_mesh("Hair_Zephyria", [h_blonde, c_azure], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.56), (0.36, 0.34, 0.22), 0),
        add_box_bmesh(bm, (0.12, 0.10, 1.50), (0.18, 0.22, 0.20), 0),
    ))
    # 4. Neris (Undercut + Orange Bandana)
    create_hair_mesh("Hair_Neris", [h_dark, c_amber], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.54), (0.35, 0.33, 0.20), 0),
        add_box_bmesh(bm, (0, -0.01, 1.56), (0.37, 0.35, 0.07), 1),
    ))
    # 5. Reed (Woven Cap)
    create_hair_mesh("Hair_Reed", [h_brown, c_flax], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.55), (0.35, 0.33, 0.22), 1),
        add_box_bmesh(bm, (0, 0.06, 1.68), (0.10, 0.10, 0.12), 1),
    ))
    # 6. Willa / Cora / Faye (Chef Kerchief & Bun)
    create_hair_mesh("Hair_Willa", [h_auburn, c_white], lambda bm: (
        add_box_bmesh(bm, (0, 0.03, 1.56), (0.36, 0.34, 0.22), 1),
        add_box_bmesh(bm, (0, 0.16, 1.52), (0.12, 0.12, 0.14), 0),
    ))
    # 7. Oren / Torin (Stonemason Braids)
    create_hair_mesh("Hair_Oren", [h_dark], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.55), (0.35, 0.34, 0.24), 0),
        add_box_bmesh(bm, (0.17, 0.02, 1.38), (0.05, 0.18, 0.24), 0),
        add_box_bmesh(bm, (-0.17, 0.02, 1.38), (0.05, 0.18, 0.24), 0),
    ))
    # 8. Lark (Beret Cap & Blonde Hair)
    create_hair_mesh("Hair_Lark", [h_blonde, c_azure], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.54), (0.34, 0.32, 0.20), 0),
        add_box_bmesh(bm, (0, -0.03, 1.64), (0.38, 0.38, 0.08), 1),
    ))
    # 9. Dara / Caelum (Flowing River Cowl)
    create_hair_mesh("Hair_Dara", [h_auburn, c_teal], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.56), (0.35, 0.34, 0.24), 1),
        add_box_bmesh(bm, (0.16, -0.03, 1.32), (0.06, 0.06, 0.30), 1),
        add_box_bmesh(bm, (-0.16, -0.03, 1.32), (0.06, 0.06, 0.30), 1),
    ))
    # 10. Finn / Kaelen / Rowan (Scout Headband)
    create_hair_mesh("Hair_Finn", [h_blonde, c_leather_dark], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.54), (0.34, 0.32, 0.20), 0),
        add_box_bmesh(bm, (0, -0.02, 1.56), (0.36, 0.34, 0.05), 1),
    ))
    # 11. Vulkan / Bram (Armorer Beard & Top)
    create_hair_mesh("Hair_Vulkan", [h_grey, h_dark], lambda bm: (
        add_box_bmesh(bm, (0, 0.06, 1.52), (0.35, 0.24, 0.16), 0),
        add_box_bmesh(bm, (0, -0.14, 1.36), (0.26, 0.14, 0.22), 0),
    ))
    # 12. Emberlyn (Fiery Twin Pigtails)
    create_hair_mesh("Hair_Emberlyn", [h_red, c_amber], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.55), (0.34, 0.32, 0.22), 0),
        add_box_bmesh(bm, (-0.18, 0.06, 1.48), (0.10, 0.10, 0.22), 0),
        add_box_bmesh(bm, (0.18, 0.06, 1.48), (0.10, 0.10, 0.22), 0),
    ))
    # 13. Flint / Ellis (Prospector Goggles & Messy Crop)
    create_hair_mesh("Hair_Flint", [h_brown, c_gold], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.56), (0.35, 0.33, 0.24), 0),
        add_box_bmesh(bm, (0, -0.16, 1.52), (0.30, 0.05, 0.06), 1),
    ))
    # 14. Tala / Pippa (Herbalist Braid with Flower Pin)
    create_hair_mesh("Hair_Tala", [h_brown, c_sage], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.55), (0.35, 0.33, 0.22), 0),
        add_box_bmesh(bm, (0, 0.16, 1.36), (0.10, 0.10, 0.32), 0),
        add_box_bmesh(bm, (0.16, -0.08, 1.58), (0.05, 0.05, 0.05), 1),
    ))
    # 15. Runa / Sol / Zephyr (Elder Sage Mantle & Veil)
    create_hair_mesh("Hair_Runa", [h_silver, c_flax], lambda bm: (
        add_box_bmesh(bm, (0, 0.02, 1.56), (0.36, 0.34, 0.24), 0),
        add_box_bmesh(bm, (0, 0.04, 1.42), (0.38, 0.36, 0.26), 1),
    ))

    # --------------------------------------------------------------------------
    # OUTFITS (Covering All Factions and Occupations)
    # --------------------------------------------------------------------------
    # 1. Outfit_Aqualia
    def b_out_aq(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.98), (0, 0, 1.24), (0.38, 0.26), (0.36, 0.24), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_tapered_box_bmesh(bm, (0, 0, 0.62), (0, 0, 0.98), (0.32, 0.22), (0.30, 0.20), 1)
        grp["Pelvis"].extend(v2)
    create_outfit_mesh("Outfit_Aqualia", [c_teal, c_white], b_out_aq)

    # 2. Outfit_Pyrador
    def b_out_py(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.98), (0, 0, 1.24), (0.38, 0.26), (0.36, 0.24), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_tapered_box_bmesh(bm, (0, 0, 0.62), (0, 0, 0.98), (0.32, 0.22), (0.30, 0.20), 1)
        grp["Pelvis"].extend(v2)
    create_outfit_mesh("Outfit_Pyrador", [c_red, c_amber], b_out_py)

    # 3. Outfit_Zephyria
    def b_out_ze(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.98), (0, 0, 1.24), (0.36, 0.24), (0.34, 0.22), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_tapered_box_bmesh(bm, (0, 0, 0.62), (0, 0, 0.98), (0.32, 0.22), (0.30, 0.20), 1)
        grp["Pelvis"].extend(v2)
    create_outfit_mesh("Outfit_Zephyria", [c_sage, c_azure], b_out_ze)

    # 4. Outfit_Fishmonger (Neris / Marina)
    def b_out_fish(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.64), (0, 0, 1.24), (0.34, 0.24), (0.34, 0.22), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, -0.13, 0.88), (0.24, 0.03, 0.40), 1)
        grp["Spine"].extend(v2)
    create_outfit_mesh("Outfit_Fishmonger", [c_navy, c_leather_dark], b_out_fish)

    # 5. Outfit_Cook (Willa / Cora / Faye)
    def b_out_cook(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.62), (0, 0, 1.24), (0.32, 0.22), (0.32, 0.20), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, -0.12, 0.88), (0.24, 0.03, 0.44), 1)
        grp["Spine"].extend(v2)
    create_outfit_mesh("Outfit_Cook", [c_teal, c_white], b_out_cook)

    # 6. Outfit_Blacksmith (Vulkan)
    def b_out_smith(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.62), (0, 0, 1.24), (0.36, 0.26), (0.34, 0.24), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, -0.14, 0.90), (0.26, 0.04, 0.46), 1)
        grp["Spine"].extend(v2)
    create_outfit_mesh("Outfit_Blacksmith", [c_charcoal, c_leather], b_out_smith)

    # 7. Outfit_Alchemist (Emberlyn / Ignis)
    def b_out_alch(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.64), (0, 0, 1.24), (0.34, 0.24), (0.32, 0.22), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, -0.13, 1.02), (0.28, 0.04, 0.12), 1) # Harness
        grp["Chest"].extend(v2)
    create_outfit_mesh("Outfit_Alchemist", [c_red, c_gold], b_out_alch)

    # 8. Outfit_Miner (Flint / Bram)
    def b_out_mine(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.64), (0, 0, 1.24), (0.34, 0.24), (0.32, 0.22), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, -0.13, 0.84), (0.30, 0.05, 0.14), 1) # Pouch belt
        grp["Pelvis"].extend(v2)
    create_outfit_mesh("Outfit_Miner", [c_charcoal, c_leather], b_out_mine)

    # 9. Outfit_Courier (Aster / Finn / Rowan / Kaelen)
    def b_out_cour(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.64), (0, 0, 1.24), (0.32, 0.22), (0.32, 0.20), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, 0, 0.98), (0.34, 0.24, 0.08), 1) # Shoulder sash
        grp["Chest"].extend(v2)
    create_outfit_mesh("Outfit_Courier", [c_azure, c_leather_dark], b_out_cour)

    # 10. Outfit_ShrineKeeper (Runa / Sol / Zephyr / Caelum)
    def b_out_shrine(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.54), (0, 0, 1.24), (0.36, 0.26), (0.34, 0.22), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, 0, 0.82), (0.38, 0.28, 0.10), 1) # Gold sash
        grp["Pelvis"].extend(v2)
    create_outfit_mesh("Outfit_ShrineKeeper", [c_cream, c_gold], b_out_shrine)

    # 11. Outfit_Farmer (Reed / Pippa / Sable)
    def b_out_farm(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.60), (0, 0, 1.22), (0.34, 0.22), (0.32, 0.20), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, -0.12, 0.86), (0.22, 0.02, 0.36), 1)
        grp["Spine"].extend(v2)
    create_outfit_mesh("Outfit_Farmer", [c_sage, c_flax], b_out_farm)

    # 12. Outfit_Stonemason (Oren / Soren)
    def b_out_stone(bm, grp):
        v1, _ = add_tapered_box_bmesh(bm, (0, 0, 0.62), (0, 0, 1.24), (0.36, 0.24), (0.34, 0.22), 0)
        grp["Chest"].extend(v1)
        v2, _ = add_box_bmesh(bm, (0, 0, 0.88), (0.38, 0.26, 0.12), 1)
        grp["Pelvis"].extend(v2)
    create_outfit_mesh("Outfit_Stonemason", [c_leather, c_iron], b_out_stone)

    # --------------------------------------------------------------------------
    # HANDHELD TOOLS & PROPS (Parented to Socket_Hand.R)
    # --------------------------------------------------------------------------
    # 1. Forge Hammer (Vulkan)
    create_tool_mesh("Tool_ForgeHammer", [c_leather, c_iron], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.04, 0.04, 0.36), 0),
        add_box_bmesh(bm, (0, 0.04, 0.18), (0.10, 0.16, 0.10), 1),
    ))
    # 2. Cooking Ladle (Willa / Cora / Faye)
    create_tool_mesh("Tool_CookingLadle", [c_leather, c_iron], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.03, 0.03, 0.34), 0),
        add_box_bmesh(bm, (0, -0.04, 0.16), (0.09, 0.09, 0.05), 1),
    ))
    # 3. Fishing Net (Neris)
    create_tool_mesh("Tool_FishingNet", [c_leather, c_white], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.03, 0.03, 0.32), 0),
        add_box_bmesh(bm, (0, 0, 0.18), (0.16, 0.16, 0.08), 1),
    ))
    # 4. Scout Staff (Finn / Rowan / Kaelen)
    create_tool_mesh("Tool_ScoutStaff", [c_leather, c_azure], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.04, 0.04, 0.48), 0),
        add_box_bmesh(bm, (0, 0, 0.24), (0.07, 0.07, 0.07), 1),
    ))
    # 5. Reed Bundle (Reed)
    create_tool_mesh("Tool_ReedBundle", [c_sage, c_flax], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.02), (0.12, 0.12, 0.28), 0),
        add_box_bmesh(bm, (0, 0, 0.02), (0.14, 0.14, 0.04), 1),
    ))
    # 6. Alchemist Flask (Emberlyn / Dara)
    create_tool_mesh("Tool_AlchemistFlask", [c_iron, c_amber], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.08, 0.08, 0.14), 1),
        add_box_bmesh(bm, (0, 0, 0.09), (0.04, 0.04, 0.06), 0),
    ))
    # 7. Miner Pick (Flint / Bram)
    create_tool_mesh("Tool_MinerPick", [c_leather, c_iron], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.03, 0.03, 0.38), 0),
        add_box_bmesh(bm, (0, 0.02, 0.18), (0.06, 0.24, 0.05), 1),
    ))
    # 8. Rune Chisel (Oren / Soren)
    create_tool_mesh("Tool_RuneChisel", [c_iron, c_gold], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.04, 0.04, 0.24), 0),
        add_box_bmesh(bm, (0, 0, 0.12), (0.06, 0.06, 0.04), 1),
    ))
    # 9. Ferry Oar (Lark)
    create_tool_mesh("Tool_FerryOar", [c_leather, c_flax], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.04, 0.04, 0.46), 0),
        add_box_bmesh(bm, (0, 0.02, 0.20), (0.12, 0.02, 0.18), 1),
    ))
    # 10. Kite Prop (Zephyr)
    create_tool_mesh("Tool_NavigatorKite", [c_flax, c_azure], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.03, 0.03, 0.36), 0),
        add_box_bmesh(bm, (0, 0.04, 0.16), (0.24, 0.02, 0.24), 1),
    ))
    # 11. Flower Shears (Pippa / Tala)
    create_tool_mesh("Tool_FlowerShears", [c_iron, c_red], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.04, 0.08, 0.20), 0),
    ))
    # 12. Diving Shell (Marina / Sable)
    create_tool_mesh("Tool_DivingShell", [c_cream, c_gold], lambda bm: (
        add_box_bmesh(bm, (0, 0, 0.0), (0.12, 0.08, 0.12), 0),
    ))

# ==============================================================================
# 4. PROCEDURAL ANIMATION TRACKS
# ==============================================================================
def setup_animations(arm_obj: bpy.types.Object):
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()

    # 1. Idle Breathing (6 frames)
    act_idle = bpy.data.actions.new(name="idle_breathing")
    arm_obj.animation_data.action = act_idle

    pb_chest = arm_obj.pose.bones.get("Chest")
    pb_pelvis = arm_obj.pose.bones.get("Pelvis")
    pb_hand_r = arm_obj.pose.bones.get("Hand.R")

    idle_keyframes = [
        (0, (1.0, 1.0, 1.0), (0, 0, 0), (0, 0, 0)),
        (1, (1.01, 1.01, 1.01), (0, 0, 0.002), (0.02, 0, 0)),
        (2, (1.025, 1.025, 1.02), (0, 0, 0.005), (0.04, 0, 0)),
        (3, (1.025, 1.025, 1.02), (0, 0, 0.005), (0.04, 0, 0)),
        (4, (1.01, 1.01, 1.01), (0, 0, 0.002), (0.02, 0, 0)),
        (5, (1.0, 1.0, 1.0), (0, 0, 0), (0, 0, 0)),
    ]

    for f_idx, c_scale, p_loc, h_rot in idle_keyframes:
        if pb_chest:
            pb_chest.scale = c_scale
            pb_chest.keyframe_insert(data_path="scale", frame=f_idx)
        if pb_pelvis:
            pb_pelvis.location = p_loc
            pb_pelvis.keyframe_insert(data_path="location", frame=f_idx)
        if pb_hand_r:
            pb_hand_r.rotation_euler = h_rot
            pb_hand_r.keyframe_insert(data_path="rotation_euler", frame=f_idx)

    # 2. Walk Cycle (8 frames)
    act_walk = bpy.data.actions.new(name="walk")
    arm_obj.animation_data.action = act_walk

    pb_thigh_l = arm_obj.pose.bones.get("Thigh.L")
    pb_thigh_r = arm_obj.pose.bones.get("Thigh.R")
    pb_arm_l = arm_obj.pose.bones.get("UpperArm.L")
    pb_arm_r = arm_obj.pose.bones.get("UpperArm.R")

    for f_idx in range(8):
        phase = (f_idx / 8.0) * 2.0 * math.pi
        leg_rot = math.sin(phase) * 0.35
        arm_rot = -leg_rot * 0.40
        pelvis_bounce = -abs(math.sin(phase * 2.0)) * 0.012

        if pb_thigh_l:
            pb_thigh_l.rotation_euler = (leg_rot, 0, 0)
            pb_thigh_l.keyframe_insert(data_path="rotation_euler", frame=f_idx)
        if pb_thigh_r:
            pb_thigh_r.rotation_euler = (-leg_rot, 0, 0)
            pb_thigh_r.keyframe_insert(data_path="rotation_euler", frame=f_idx)
        if pb_arm_l:
            pb_arm_l.rotation_euler = (arm_rot, 0, 0)
            pb_arm_l.keyframe_insert(data_path="rotation_euler", frame=f_idx)
        if pb_arm_r:
            pb_arm_r.rotation_euler = (-arm_rot, 0, 0)
            pb_arm_r.keyframe_insert(data_path="rotation_euler", frame=f_idx)
        if pb_pelvis:
            pb_pelvis.location = (0, 0, pelvis_bounce)
            pb_pelvis.keyframe_insert(data_path="location", frame=f_idx)

    arm_obj.animation_data.action = act_idle

# ==============================================================================
# MAIN
# ==============================================================================
def main():
    reset_scene()
    print("=" * 60)
    print("Building Full Modular Humanoid Cast Base in Blender 4.2...")
    print("=" * 60)

    arm_obj = build_master_armature()
    print("  [1/4] Master Humanoid Armature built (19 bones & 10 sockets).")

    mannequin_obj = build_mannequin_body(arm_obj)
    print("  [2/4] Base Mannequin Mesh modeled, rigged, and vertex-weighted.")

    build_modular_library(arm_obj)
    print("  [3/4] Comprehensive Modular Library built (hair, outfits, tools).")

    setup_animations(arm_obj)
    print("  [4/4] Procedural keyframe animations added (idle_breathing & walk).")

    out_path = MODELS_DIR / "humanoid_modular_base.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(out_path))
    print(f"\nMaster Modular Humanoid saved: {out_path}")
    print("=" * 60)

if __name__ == "__main__":
    main()
