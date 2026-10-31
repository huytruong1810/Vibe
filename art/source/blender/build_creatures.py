"""
Procedural 3D Mesh Generator for all 8 Hearthwild Creatures.
Constructs authentic low-poly stylized meshes for:
1. rivallie (water otter-drake with crest fins and fan tail)
2. ignicap (fire mushroom wanderer with glowing cap)
3. zephyrit (wind aerodynamic feathered companion)
4. mireling (mossy wetland quadruped with reed tendrils)
5. cindermoth (hovering fire/wind moth with ember antennae)
6. steamshell (geothermal steam-venting tortoise)
7. bramblefang (ember-maned predatory hunter)
8. marshstalker (sinuous low-slung wetland stalker)

Saves all 8 species into art/source/blender/models/creatures.blend
with calibrated ground contact (0, 0, 0) -> pixel (48, 86) on 96x96 canvas.
"""

import sys
import math
from pathlib import Path

try:
    import bpy
    import bmesh
except ImportError:
    print("This script must be executed inside Blender: blender -b -P build_creatures.py")
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

def add_box(bm, center, size, mat_idx=0):
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
        (v0, v1, v2, v3), # -Z
        (v4, v7, v6, v5), # +Z
        (v0, v4, v5, v1), # -Y
        (v2, v6, v7, v3), # +Y
        (v0, v3, v7, v4), # -X
        (v1, v5, v6, v2), # +X
    ]
    for face_verts in faces:
        f = bm.faces.new(face_verts)
        f.material_index = mat_idx

def add_tapered_box(bm, b_center, t_center, b_size, t_size, mat_idx=0):
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
        (v0, v1, v2, v3),
        (v4, v7, v6, v5),
        (v0, v4, v5, v1),
        (v2, v6, v7, v3),
        (v0, v3, v7, v4),
        (v1, v5, v6, v2),
    ]
    for face_verts in faces:
        f = bm.faces.new(face_verts)
        f.material_index = mat_idx

# ==============================================================================
# 1. RIVALLIE (Water Otter-Drake)
# ==============================================================================
def create_rivallie_mesh() -> bpy.types.Object:
    m_teal = create_material("M_RivTeal", *hex_to_rgb("286775"))
    m_dark = create_material("M_RivDark", *hex_to_rgb("1b4852"))
    m_cream = create_material("M_RivCream", *hex_to_rgb("e6f6ee"))
    m_aqua = create_material("M_RivAqua", *hex_to_rgb("4ecdc4"))
    m_gold = create_material("M_RivGold", *hex_to_rgb("f5b82e"))
    m_nose = create_material("M_RivNose", *hex_to_rgb("162429"))
    mats = [m_teal, m_dark, m_cream, m_aqua, m_gold, m_nose]

    mesh = bpy.data.meshes.new("Mesh_Rivallie")
    bm = bmesh.new()

    # Paws
    for px, py in [(-0.16, -0.16), (0.16, -0.16), (-0.16, 0.16), (0.16, 0.16)]:
        add_box(bm, (px, py, 0.04), (0.10, 0.12, 0.08), 1)
        add_box(bm, (px, py, 0.14), (0.09, 0.10, 0.12), 0)

    # Torso
    add_box(bm, (0.0, 0.0, 0.20), (0.28, 0.44, 0.10), 2) # Belly
    add_box(bm, (0.0, 0.0, 0.30), (0.30, 0.46, 0.14), 0) # Back
    add_box(bm, (0.0, 0.0, 0.39), (0.05, 0.38, 0.06), 3) # Spinal crest

    # Head & Snout
    add_box(bm, (0.0, -0.28, 0.34), (0.24, 0.20, 0.18), 0)
    add_box(bm, (0.0, -0.38, 0.30), (0.16, 0.14, 0.12), 2)
    add_box(bm, (0.0, -0.45, 0.33), (0.05, 0.03, 0.04), 5) # Nose

    # Eyes
    add_box(bm, (-0.11, -0.32, 0.38), (0.03, 0.03, 0.04), 4)
    add_box(bm, (0.11, -0.32, 0.38), (0.03, 0.03, 0.04), 4)

    # Ear crests
    add_box(bm, (-0.16, -0.22, 0.42), (0.08, 0.06, 0.10), 3)
    add_box(bm, (0.16, -0.22, 0.42), (0.08, 0.06, 0.10), 3)

    # Paddle tail
    add_box(bm, (0.0, 0.28, 0.26), (0.20, 0.14, 0.08), 0)
    add_box(bm, (0.0, 0.42, 0.24), (0.30, 0.18, 0.05), 3)
    add_box(bm, (0.0, 0.54, 0.22), (0.24, 0.10, 0.03), 0)

    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Creature_Rivallie", mesh)
    for m in mats: obj.data.materials.append(m)
    return obj

# ==============================================================================
# 2. IGNICAP (Fire Smoldering Mushroom Wanderer)
# ==============================================================================
def create_ignicap_mesh() -> bpy.types.Object:
    m_cap_red = create_material("M_IgCapRed", *hex_to_rgb("c93d28"))
    m_cap_rim = create_material("M_IgCapRim", *hex_to_rgb("f59638"))
    m_stalk = create_material("M_IgStalk", *hex_to_rgb("38343b"))
    m_ember = create_material("M_IgEmber", *hex_to_rgb("ffe066"))
    m_spores = create_material("M_IgSpores", *hex_to_rgb("e8c67d"))
    mats = [m_cap_red, m_cap_rim, m_stalk, m_ember, m_spores]

    mesh = bpy.data.meshes.new("Mesh_Ignicap")
    bm = bmesh.new()

    # Stout charcoal stalk & root feet
    for fx, fy in [(-0.10, -0.06), (0.10, -0.06), (0.0, 0.10)]:
        add_box(bm, (fx, fy, 0.04), (0.10, 0.10, 0.08), 2)

    add_tapered_box(bm, (0.0, 0.0, 0.06), (0.0, 0.0, 0.32), (0.28, 0.24), (0.22, 0.20), 2)

    # Little glowing charcoal eyes
    add_box(bm, (-0.07, -0.11, 0.24), (0.03, 0.02, 0.04), 3)
    add_box(bm, (0.07, -0.11, 0.24), (0.03, 0.02, 0.04), 3)

    # Smoldering Mushroom Dome Cap
    # Lower cap gills & overhang
    add_box(bm, (0.0, 0.0, 0.34), (0.46, 0.44, 0.06), 4)
    # Red Cap Mid
    add_box(bm, (0.0, 0.0, 0.40), (0.50, 0.48, 0.10), 0)
    # Red Cap Top Dome
    add_box(bm, (0.0, 0.0, 0.48), (0.36, 0.36, 0.08), 0)
    add_box(bm, (0.0, 0.0, 0.54), (0.22, 0.22, 0.06), 0)

    # Glowing Ember Cap Spots
    add_box(bm, (-0.12, -0.12, 0.45), (0.06, 0.06, 0.04), 3)
    add_box(bm, (0.14, -0.08, 0.47), (0.07, 0.07, 0.04), 3)
    add_box(bm, (-0.08, 0.14, 0.48), (0.06, 0.06, 0.04), 3)
    add_box(bm, (0.08, 0.12, 0.46), (0.08, 0.08, 0.04), 1)

    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Creature_Ignicap", mesh)
    for m in mats: obj.data.materials.append(m)
    return obj

# ==============================================================================
# 3. ZEPHYRIT (Wind Feathered Companion)
# ==============================================================================
def create_zephyrit_mesh() -> bpy.types.Object:
    m_body = create_material("M_ZephBody", *hex_to_rgb("ede49d"))
    m_wing = create_material("M_ZephWing", *hex_to_rgb("ffffff"))
    m_aqua = create_material("M_ZephAqua", *hex_to_rgb("6bcbc4"))
    m_eye = create_material("M_ZephEye", *hex_to_rgb("1d3557"))
    m_beak = create_material("M_ZephBeak", *hex_to_rgb("f4a261"))
    mats = [m_body, m_wing, m_aqua, m_eye, m_beak]

    mesh = bpy.data.meshes.new("Mesh_Zephyrit")
    bm = bmesh.new()

    # Sleek talons / paws
    for px, py in [(-0.12, -0.08), (0.12, -0.08), (-0.10, 0.10), (0.10, 0.10)]:
        add_box(bm, (px, py, 0.04), (0.07, 0.08, 0.08), 4)

    # Streamlined Body
    add_tapered_box(bm, (0.0, 0.08, 0.16), (0.0, -0.10, 0.28), (0.22, 0.30), (0.18, 0.22), 0)

    # Glider Wing Tufts
    add_box(bm, (-0.18, 0.02, 0.26), (0.12, 0.26, 0.04), 1)
    add_box(bm, (0.18, 0.02, 0.26), (0.12, 0.26, 0.04), 1)
    add_box(bm, (-0.22, 0.04, 0.27), (0.06, 0.18, 0.02), 2)
    add_box(bm, (0.22, 0.04, 0.27), (0.06, 0.18, 0.02), 2)

    # Head & Avian Beak/Muzzle
    add_box(bm, (0.0, -0.18, 0.36), (0.18, 0.18, 0.16), 0)
    add_box(bm, (0.0, -0.28, 0.32), (0.08, 0.10, 0.07), 4)

    # Deep Eyes
    add_box(bm, (-0.08, -0.22, 0.38), (0.03, 0.03, 0.04), 3)
    add_box(bm, (0.08, -0.22, 0.38), (0.03, 0.03, 0.04), 3)

    # Swept-Back Wind Crest Plumes
    add_box(bm, (0.0, -0.14, 0.46), (0.08, 0.16, 0.08), 2)
    add_box(bm, (0.0, -0.04, 0.52), (0.06, 0.20, 0.06), 1)

    # Fan Feather Tail
    add_box(bm, (0.0, 0.26, 0.24), (0.14, 0.14, 0.04), 1)
    add_box(bm, (0.0, 0.38, 0.28), (0.22, 0.16, 0.03), 2)

    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Creature_Zephyrit", mesh)
    for m in mats: obj.data.materials.append(m)
    return obj

# ==============================================================================
# 4. MIRELING (Mossy Wetland Companion)
# ==============================================================================
def create_mireling_mesh() -> bpy.types.Object:
    m_moss = create_material("M_MireMoss", *hex_to_rgb("6d8557"))
    m_peat = create_material("M_MirePeat", *hex_to_rgb("42362b"))
    m_tendril = create_material("M_MireTendril", *hex_to_rgb("9ac46e"))
    m_eye = create_material("M_MireEye", *hex_to_rgb("d4f0d2"))
    mats = [m_moss, m_peat, m_tendril, m_eye]

    mesh = bpy.data.meshes.new("Mesh_Mireling")
    bm = bmesh.new()

    # Mud pads
    for px, py in [(-0.14, -0.12), (0.14, -0.12), (-0.14, 0.12), (0.14, 0.12)]:
        add_box(bm, (px, py, 0.03), (0.10, 0.10, 0.06), 1)

    # Rounded moss body
    add_box(bm, (0.0, 0.0, 0.16), (0.34, 0.38, 0.18), 0)
    add_box(bm, (0.0, 0.0, 0.28), (0.30, 0.32, 0.12), 0)

    # Gentle face
    add_box(bm, (0.0, -0.20, 0.18), (0.22, 0.14, 0.14), 0)
    add_box(bm, (0.0, -0.27, 0.15), (0.14, 0.08, 0.08), 1) # Peat snout

    # Dewdrop clear eyes
    add_box(bm, (-0.09, -0.22, 0.22), (0.03, 0.03, 0.03), 3)
    add_box(bm, (0.09, -0.22, 0.22), (0.03, 0.03, 0.03), 3)

    # Sprouting Twin Reed Tendrils on Back
    add_box(bm, (-0.08, 0.06, 0.38), (0.04, 0.04, 0.16), 2)
    add_box(bm, (-0.08, 0.08, 0.48), (0.06, 0.06, 0.08), 2)
    add_box(bm, (0.08, 0.02, 0.40), (0.04, 0.04, 0.18), 2)
    add_box(bm, (0.08, 0.04, 0.50), (0.06, 0.06, 0.08), 2)

    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Creature_Mireling", mesh)
    for m in mats: obj.data.materials.append(m)
    return obj

# ==============================================================================
# 5. CINDERMOTH (Fire/Wind Hovering Flame Moth)
# ==============================================================================
def create_cindermoth_mesh() -> bpy.types.Object:
    m_body = create_material("M_CindBody", *hex_to_rgb("2c2429"))
    m_wing_rose = create_material("M_CindRose", *hex_to_rgb("d47285"))
    m_wing_flame = create_material("M_CindFlame", *hex_to_rgb("f08c48"))
    m_ember = create_material("M_CindEmber", *hex_to_rgb("ffe066"))
    mats = [m_body, m_wing_rose, m_wing_flame, m_ember]

    mesh = bpy.data.meshes.new("Mesh_Cindermoth")
    bm = bmesh.new()

    # Hovering segmented thorax & abdomen (elevated above ground z=0.28)
    add_box(bm, (0.0, -0.06, 0.32), (0.12, 0.14, 0.14), 0)
    add_box(bm, (0.0, 0.12, 0.28), (0.10, 0.24, 0.10), 0)

    # Feathery glowing antennae
    add_box(bm, (-0.06, -0.16, 0.42), (0.03, 0.08, 0.10), 3)
    add_box(bm, (0.06, -0.16, 0.42), (0.03, 0.08, 0.10), 3)

    # Dual Wing Planes
    # Forewings
    add_box(bm, (-0.24, -0.02, 0.38), (0.32, 0.22, 0.02), 1)
    add_box(bm, (0.24, -0.02, 0.38), (0.32, 0.22, 0.02), 1)
    # Wing Flame Accents
    add_box(bm, (-0.26, -0.02, 0.39), (0.18, 0.12, 0.01), 2)
    add_box(bm, (0.26, -0.02, 0.39), (0.18, 0.12, 0.01), 2)

    # Hindwings
    add_box(bm, (-0.18, 0.16, 0.32), (0.22, 0.18, 0.02), 2)
    add_box(bm, (0.18, 0.16, 0.32), (0.22, 0.18, 0.02), 2)

    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Creature_Cindermoth", mesh)
    for m in mats: obj.data.materials.append(m)
    return obj

# ==============================================================================
# 6. STEAMSHELL (Geothermal Steam-Venting Tortoise)
# ==============================================================================
def create_steamshell_mesh() -> bpy.types.Object:
    m_shell = create_material("M_SteamShell", *hex_to_rgb("464a57"))
    m_rim = create_material("M_SteamRim", *hex_to_rgb("c29668"))
    m_skin = create_material("M_SteamSkin", *hex_to_rgb("a394ba"))
    m_steam = create_material("M_SteamCloud", *hex_to_rgb("f0f4f8"))
    m_eye = create_material("M_SteamEye", *hex_to_rgb("1a1f26"))
    mats = [m_shell, m_rim, m_skin, m_steam, m_eye]

    mesh = bpy.data.meshes.new("Mesh_Steamshell")
    bm = bmesh.new()

    # Heavy pillar legs
    for px, py in [(-0.18, -0.16), (0.18, -0.16), (-0.18, 0.16), (0.18, 0.16)]:
        add_box(bm, (px, py, 0.06), (0.12, 0.12, 0.12), 2)

    # Protective Carapace Rim
    add_box(bm, (0.0, 0.0, 0.18), (0.48, 0.52, 0.08), 1)
    # Volcanic Slate Dome Shell
    add_box(bm, (0.0, 0.0, 0.28), (0.42, 0.46, 0.16), 0)
    add_box(bm, (0.0, 0.0, 0.38), (0.30, 0.34, 0.08), 0)

    # Twin Geothermal Chimney Vents & Steam Puffs
    add_box(bm, (-0.09, 0.06, 0.44), (0.07, 0.07, 0.08), 0)
    add_box(bm, (0.09, 0.06, 0.44), (0.07, 0.07, 0.08), 0)
    # Steam puffs
    add_box(bm, (-0.09, 0.06, 0.52), (0.10, 0.10, 0.08), 3)
    add_box(bm, (0.09, 0.06, 0.54), (0.12, 0.12, 0.09), 3)

    # Wrinkled Tortoise Head
    add_box(bm, (0.0, -0.30, 0.18), (0.18, 0.18, 0.14), 2)
    add_box(bm, (-0.08, -0.32, 0.21), (0.02, 0.03, 0.03), 4)
    add_box(bm, (0.08, -0.32, 0.21), (0.02, 0.03, 0.03), 4)

    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Creature_Steamshell", mesh)
    for m in mats: obj.data.materials.append(m)
    return obj

# ==============================================================================
# 7. BRAMBLEFANG (Ember-Maned Apex Hunter)
# ==============================================================================
def create_bramblefang_mesh() -> bpy.types.Object:
    m_pelt = create_material("M_BramPelt", *hex_to_rgb("b86b3e"))
    m_mane = create_material("M_BramMane", *hex_to_rgb("c93d28"))
    m_dark = create_material("M_BramDark", *hex_to_rgb("2a1d18"))
    m_gold = create_material("M_BramGold", *hex_to_rgb("ffcc00"))
    mats = [m_pelt, m_mane, m_dark, m_gold]

    mesh = bpy.data.meshes.new("Mesh_Bramblefang")
    bm = bmesh.new()

    # Muscular stalker paws
    for px, py in [(-0.16, -0.22), (0.16, -0.22), (-0.16, 0.20), (0.16, 0.20)]:
        add_box(bm, (px, py, 0.06), (0.10, 0.12, 0.12), 2)
        add_box(bm, (px, py, 0.18), (0.09, 0.10, 0.14), 0)

    # Sleek predatory torso
    add_box(bm, (0.0, 0.0, 0.28), (0.28, 0.50, 0.16), 0)

    # Spiky Flame-Thorn Mane Collar
    add_box(bm, (0.0, -0.16, 0.38), (0.36, 0.22, 0.20), 1)
    add_box(bm, (0.0, -0.14, 0.48), (0.24, 0.16, 0.10), 1)

    # Sharp Hunter Muzzle & Blazing Eyes
    add_box(bm, (0.0, -0.32, 0.38), (0.20, 0.18, 0.16), 0)
    add_box(bm, (0.0, -0.42, 0.34), (0.12, 0.14, 0.10), 2) # Snout
    add_box(bm, (-0.09, -0.34, 0.42), (0.03, 0.03, 0.04), 3) # Eyes
    add_box(bm, (0.09, -0.34, 0.42), (0.03, 0.03, 0.04), 3)

    # Long predator tail with flame tuft
    add_box(bm, (0.0, 0.32, 0.32), (0.10, 0.20, 0.08), 0)
    add_box(bm, (0.0, 0.46, 0.36), (0.12, 0.14, 0.10), 1)

    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Creature_Bramblefang", mesh)
    for m in mats: obj.data.materials.append(m)
    return obj

# ==============================================================================
# 8. MARSHSTALKER (Low-Slung Wetland Stalker)
# ==============================================================================
def create_marshstalker_mesh() -> bpy.types.Object:
    m_teal = create_material("M_MarshTeal", *hex_to_rgb("2c5047"))
    m_dark = create_material("M_MarshDark", *hex_to_rgb("172e29"))
    m_crest = create_material("M_MarshCrest", *hex_to_rgb("52a893"))
    m_amber = create_material("M_MarshAmber", *hex_to_rgb("e6a833"))
    mats = [m_teal, m_dark, m_crest, m_amber]

    mesh = bpy.data.meshes.new("Mesh_Marshstalker")
    bm = bmesh.new()

    # Stealth pads
    for px, py in [(-0.18, -0.22), (0.18, -0.22), (-0.18, 0.22), (0.18, 0.22)]:
        add_box(bm, (px, py, 0.04), (0.11, 0.12, 0.08), 1)

    # Elongated low-slung body
    add_box(bm, (0.0, 0.0, 0.18), (0.28, 0.60, 0.14), 0)

    # Dorsal Reed Fin
    add_box(bm, (0.0, 0.0, 0.29), (0.04, 0.50, 0.10), 2)

    # Sinuous neck & head
    add_box(bm, (0.0, -0.36, 0.22), (0.20, 0.22, 0.12), 0)
    add_box(bm, (0.0, -0.48, 0.20), (0.14, 0.16, 0.08), 1)

    # Predatory slit eyes
    add_box(bm, (-0.08, -0.40, 0.26), (0.02, 0.04, 0.03), 3)
    add_box(bm, (0.08, -0.40, 0.26), (0.02, 0.04, 0.03), 3)

    # Rudder tail (arched slightly upward)
    add_box(bm, (0.0, 0.34, 0.26), (0.14, 0.22, 0.08), 0)
    add_box(bm, (0.0, 0.46, 0.34), (0.06, 0.16, 0.12), 2)
    add_box(bm, (0.0, 0.54, 0.40), (0.04, 0.10, 0.08), 2)

    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Creature_Marshstalker", mesh)
    for m in mats: obj.data.materials.append(m)
    return obj

# ==============================================================================
# MAIN SCENE BUILDER
# ==============================================================================
def main():
    reset_scene()
    print("=" * 60)
    print("Building All 8 3D Creatures in Blender 4.2...")
    print("=" * 60)

    builders = [
        ("rivallie", create_rivallie_mesh),
        ("ignicap", create_ignicap_mesh),
        ("zephyrit", create_zephyrit_mesh),
        ("mireling", create_mireling_mesh),
        ("cindermoth", create_cindermoth_mesh),
        ("steamshell", create_steamshell_mesh),
        ("bramblefang", create_bramblefang_mesh),
        ("marshstalker", create_marshstalker_mesh),
    ]

    col = bpy.data.collections.new("Col_Creatures")
    bpy.context.scene.collection.children.link(col)

    for name, builder in builders:
        obj = builder()
        col.objects.link(obj)
        print(f"  [+] Modeled 3D Creature: {name} ({obj.name})")

    out_path = MODELS_DIR / "creatures.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(out_path))
    print(f"\nAll 8 Creatures successfully saved to: {out_path}")
    print("=" * 60)

if __name__ == "__main__":
    main()
