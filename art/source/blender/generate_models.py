"""
Procedural 3D Mesh Generator for Hearthwild Blender Models.
Constructs low-poly stylized models for Player Aqualia and Rivallie
with exact zero-drift ground anchors, clean JRPG materials, and proper camera framing.
"""

from pathlib import Path
import bpy
import bmesh

REPO_ROOT = Path(__file__).resolve().parents[3]
MODELS_DIR = REPO_ROOT / "art" / "source" / "blender" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_material(name: str, r: float, g: float, b: float, a: float = 1.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (r, g, b, a)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (r, g, b, a)
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.8
    return mat

def hex_to_rgb(hex_str: str) -> tuple[float, float, float]:
    hex_str = hex_str.lstrip("#")
    return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def add_box(bm, center, size, mat_idx):
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
        (0, 1, 2, 3), # Bottom (-Z)
        (4, 7, 6, 5), # Top (+Z)
        (0, 4, 5, 1), # Front (-Y)
        (2, 6, 7, 3), # Back (+Y)
        (0, 3, 7, 4), # Left (-X)
        (1, 5, 6, 2), # Right (+X)
    ]
    for f in faces:
        face = bm.faces.new([verts[i] for i in f])
        face.material_index = mat_idx

def add_tapered_box(bm, bottom_center, top_center, bottom_size, top_size, mat_idx):
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
    for f in faces:
        face = bm.faces.new([verts[i] for i in f])
        face.material_index = mat_idx

def build_player_model():
    reset_scene()
    print("Building Player Aqualia 3D model...")

    c_skin = create_material("M_Skin", *hex_to_rgb("f4d3b8"))
    c_hair = create_material("M_Hair", *hex_to_rgb("235c59"))
    c_hair_hi = create_material("M_HairHighlight", *hex_to_rgb("449994"))
    c_poncho = create_material("M_Poncho", *hex_to_rgb("2d7a78"))
    c_poncho_trim = create_material("M_PonchoTrim", *hex_to_rgb("78b5b8"))
    c_tunic = create_material("M_Tunic", *hex_to_rgb("ede4d1"))
    c_pants = create_material("M_Pants", *hex_to_rgb("2b3342"))
    c_boots = create_material("M_Boots", *hex_to_rgb("4a2e1b"))
    c_belt = create_material("M_Belt", *hex_to_rgb("3d2012"))
    c_gold = create_material("M_Gold", *hex_to_rgb("e8be48"))
    c_shell = create_material("M_Shell", *hex_to_rgb("ffffff"))
    c_eye_dark = create_material("M_EyeDark", *hex_to_rgb("1b2d2f"))
    c_eye_teal = create_material("M_EyeTeal", *hex_to_rgb("2da89f"))

    materials = [
        c_skin, c_hair, c_hair_hi, c_poncho, c_poncho_trim,
        c_tunic, c_pants, c_boots, c_belt, c_gold, c_shell,
        c_eye_dark, c_eye_teal
    ]
    mat_map = {m.name: idx for idx, m in enumerate(materials)}

    mesh = bpy.data.meshes.new("PlayerMesh")
    bm = bmesh.new()

    # Exact base Z calibrated for lowest pixel y=132
    z_base = -0.847

    # 1. Boots (left & right)
    for side in [-1, 1]:
        bx = side * 0.14
        # Sole & foot
        add_box(bm, (bx, -0.02, z_base + 0.10), (0.14, 0.22, 0.20), mat_map["M_Boots"])
        # Boot shaft
        add_box(bm, (bx, -0.01, z_base + 0.26), (0.15, 0.18, 0.18), mat_map["M_Boots"])

    # 2. Pants / Legs
    for side in [-1, 1]:
        lx = side * 0.13
        add_box(bm, (lx, 0.0, z_base + 0.44), (0.13, 0.16, 0.22), mat_map["M_Pants"])

    # 3. Tunic / Pelvis / Lower Torso
    add_box(bm, (0.0, 0.0, z_base + 0.62), (0.30, 0.22, 0.16), mat_map["M_Tunic"])
    # Belt
    add_box(bm, (0.0, 0.0, z_base + 0.70), (0.32, 0.23, 0.07), mat_map["M_Belt"])
    # Belt Buckle (front)
    add_box(bm, (0.0, -0.12, z_base + 0.70), (0.08, 0.02, 0.06), mat_map["M_Gold"])

    # 4. Upper Torso & Chest
    add_box(bm, (0.0, 0.0, z_base + 0.86), (0.30, 0.22, 0.26), mat_map["M_Tunic"])

    # 5. Poncho / Shawl
    add_tapered_box(
        bm,
        bottom_center=(0.0, 0.0, z_base + 0.68),
        top_center=(0.0, 0.0, z_base + 1.02),
        bottom_size=(0.48, 0.34),
        top_size=(0.38, 0.26),
        mat_idx=mat_map["M_Poncho"]
    )
    # Poncho trim hem
    add_box(bm, (0.0, 0.0, z_base + 0.67), (0.50, 0.35, 0.04), mat_map["M_PonchoTrim"])
    # Gold Clasp / Shell Brooch at chest
    add_box(bm, (0.0, -0.17, z_base + 0.94), (0.07, 0.03, 0.07), mat_map["M_Gold"])

    # 6. Arms & Hands
    for side in [-1, 1]:
        ax = side * 0.26
        add_box(bm, (ax, 0.0, z_base + 0.86), (0.10, 0.14, 0.22), mat_map["M_Poncho"])
        add_box(bm, (ax, -0.01, z_base + 0.68), (0.09, 0.12, 0.18), mat_map["M_Poncho"])
        add_box(bm, (ax, -0.02, z_base + 0.55), (0.07, 0.09, 0.09), mat_map["M_Skin"])

    # 7. Neck & Head
    add_box(bm, (0.0, 0.0, z_base + 1.08), (0.12, 0.12, 0.10), mat_map["M_Skin"])
    # Head base
    add_box(bm, (0.0, -0.02, z_base + 1.28), (0.30, 0.30, 0.32), mat_map["M_Skin"])

    # 8. Face Features (Front facing -Y)
    add_box(bm, (-0.08, -0.175, z_base + 1.29), (0.06, 0.01, 0.08), mat_map["M_EyeDark"])
    add_box(bm, (0.08, -0.175, z_base + 1.29), (0.06, 0.01, 0.08), mat_map["M_EyeDark"])
    add_box(bm, (-0.08, -0.176, z_base + 1.28), (0.04, 0.01, 0.05), mat_map["M_EyeTeal"])
    add_box(bm, (0.08, -0.176, z_base + 1.28), (0.04, 0.01, 0.05), mat_map["M_EyeTeal"])

    # 9. Aqualia Hair
    # Bangs
    add_box(bm, (0.0, -0.16, z_base + 1.40), (0.32, 0.08, 0.12), mat_map["M_HairHighlight"])
    # Top hair crown
    add_box(bm, (0.0, 0.0, z_base + 1.48), (0.34, 0.34, 0.14), mat_map["M_Hair"])
    # Back hair volume
    add_box(bm, (0.0, 0.14, z_base + 1.24), (0.32, 0.14, 0.38), mat_map["M_Hair"])
    # Long flowing locks down back
    add_box(bm, (0.0, 0.15, z_base + 0.98), (0.28, 0.12, 0.28), mat_map["M_Hair"])
    # Side hair locks
    add_box(bm, (-0.16, -0.04, z_base + 1.22), (0.08, 0.28, 0.32), mat_map["M_Hair"])
    add_box(bm, (0.16, -0.04, z_base + 1.22), (0.08, 0.28, 0.32), mat_map["M_Hair"])

    # 10. White Shell Hairpin on right side
    add_box(bm, (0.19, -0.12, z_base + 1.38), (0.05, 0.06, 0.06), mat_map["M_Shell"])

    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Player", mesh)
    for m in materials:
        obj.data.materials.append(m)

    bpy.context.scene.collection.objects.link(obj)

    out_path = MODELS_DIR / "player_aqualia.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(out_path))
    print(f"Saved: {out_path}")

def build_rivallie_model():
    reset_scene()
    print("Building Rivallie 3D model...")

    c_teal = create_material("M_RivallieTeal", *hex_to_rgb("286775"))
    c_teal_shade = create_material("M_RivallieDark", *hex_to_rgb("1b4852"))
    c_cream = create_material("M_RivallieCream", *hex_to_rgb("e6f6ee"))
    c_aqua = create_material("M_RivallieAqua", *hex_to_rgb("4ecdc4"))
    c_eye_gold = create_material("M_RivallieEyeGold", *hex_to_rgb("f5b82e"))
    c_eye_dark = create_material("M_RivallieEyeDark", *hex_to_rgb("162429"))
    c_nose = create_material("M_RivallieNose", *hex_to_rgb("162b28"))

    materials = [
        c_teal, c_teal_shade, c_cream, c_aqua,
        c_eye_gold, c_eye_dark, c_nose
    ]
    mat_map = {m.name: idx for idx, m in enumerate(materials)}

    mesh = bpy.data.meshes.new("RivallieMesh")
    bm = bmesh.new()

    # Exact base Z calibrated for lowest pixel y=86
    z_base = -0.556

    # 1. Four Webbed Paws
    paws = [
        (-0.16, -0.18, "FL"),
        (0.16, -0.18, "FR"),
        (-0.16, 0.16, "HL"),
        (0.16, 0.16, "HR"),
    ]
    for px, py, name in paws:
        add_box(bm, (px, py, z_base + 0.04), (0.10, 0.12, 0.08), mat_map["M_RivallieDark"])
        add_box(bm, (px, py, z_base + 0.14), (0.09, 0.10, 0.14), mat_map["M_RivallieTeal"])

    # 2. Main Torso
    add_box(bm, (0.0, 0.0, z_base + 0.22), (0.28, 0.44, 0.10), mat_map["M_RivallieCream"])
    add_box(bm, (0.0, 0.0, z_base + 0.32), (0.30, 0.46, 0.14), mat_map["M_RivallieTeal"])
    add_box(bm, (0.0, 0.0, z_base + 0.41), (0.06, 0.38, 0.06), mat_map["M_RivallieAqua"])

    # 3. Head & Snout (Front -Y)
    add_box(bm, (0.0, -0.28, z_base + 0.36), (0.24, 0.20, 0.18), mat_map["M_RivallieTeal"])
    add_box(bm, (0.0, -0.38, z_base + 0.31), (0.16, 0.14, 0.12), mat_map["M_RivallieCream"])
    add_box(bm, (0.0, -0.455, z_base + 0.34), (0.05, 0.03, 0.04), mat_map["M_RivallieNose"])

    # Eyes
    add_box(bm, (-0.11, -0.32, z_base + 0.40), (0.03, 0.04, 0.05), mat_map["M_RivallieEyeDark"])
    add_box(bm, (0.11, -0.32, z_base + 0.40), (0.03, 0.04, 0.05), mat_map["M_RivallieEyeDark"])
    add_box(bm, (-0.115, -0.32, z_base + 0.40), (0.02, 0.025, 0.03), mat_map["M_RivallieEyeGold"])
    add_box(bm, (0.115, -0.32, z_base + 0.40), (0.02, 0.025, 0.03), mat_map["M_RivallieEyeGold"])

    # 4. Aquatic Ear Crest Fins
    add_box(bm, (-0.16, -0.22, z_base + 0.44), (0.08, 0.06, 0.10), mat_map["M_RivallieAqua"])
    add_box(bm, (0.16, -0.22, z_base + 0.44), (0.08, 0.06, 0.10), mat_map["M_RivallieAqua"])

    # 5. Wide Paddle Fan Tail
    add_box(bm, (0.0, 0.26, z_base + 0.28), (0.18, 0.12, 0.08), mat_map["M_RivallieTeal"])
    add_box(bm, (0.0, 0.38, z_base + 0.26), (0.28, 0.16, 0.05), mat_map["M_RivallieTeal"])
    add_box(bm, (0.0, 0.52, z_base + 0.24), (0.34, 0.18, 0.04), mat_map["M_RivallieAqua"])
    add_box(bm, (0.0, 0.62, z_base + 0.23), (0.24, 0.08, 0.03), mat_map["M_RivallieAqua"])

    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Rivallie", mesh)
    for m in materials:
        obj.data.materials.append(m)

    bpy.context.scene.collection.objects.link(obj)

    out_path = MODELS_DIR / "rivallie.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(out_path))
    print(f"Saved: {out_path}")

if __name__ == "__main__":
    build_player_model()
    build_rivallie_model()
    print("All models successfully built and saved!")
