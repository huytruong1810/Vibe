"""
3D Geometric Mesh & Voxel Projection Engine for Hearthwild Sprites.
Provides 100% volumetric consistency across all 8 rotational facings with zero identity drift.
"""

from typing import List, Tuple
import numpy as np
from PIL import Image
import scipy.ndimage

def create_zbuffer_canvas(width: int, height: int):
    color_buffer = np.zeros((height, width, 4), dtype=np.uint8)
    depth_buffer = np.full((height, width), -1e9, dtype=np.float32)
    normal_buffer = np.zeros((height, width, 3), dtype=np.float32)
    return color_buffer, depth_buffer, normal_buffer

def rasterize_lit_voxels(
    points: np.ndarray,
    base_colors: np.ndarray,
    normals: np.ndarray,
    color_buf: np.ndarray,
    depth_buf: np.ndarray,
    norm_buf: np.ndarray,
    rot_y_deg: float,
    tilt_x_deg: float = 20.0,
    scale: float = 1.0,
    offset: Tuple[int, int] = (48, 86)
):
    rad_y = np.radians(rot_y_deg)
    rad_x = np.radians(tilt_x_deg)

    cos_y, sin_y = np.cos(rad_y), np.sin(rad_y)
    cos_x, sin_x = np.cos(rad_x), np.sin(rad_x)

    # 1. Rotate positions around vertical Y axis
    x = points[:, 0] * cos_y - points[:, 2] * sin_y
    y = points[:, 1]
    z = points[:, 0] * sin_y + points[:, 2] * cos_y

    # 2. Rotate normals
    nx = normals[:, 0] * cos_y - normals[:, 2] * sin_y
    ny = normals[:, 1]
    nz = normals[:, 0] * sin_y + normals[:, 2] * cos_y

    # 3. Camera pitch (tilt looking down)
    y_screen = y * cos_x - z * sin_x
    z_depth = y * sin_x + z * cos_x
    x_screen = x

    ny_screen = ny * cos_x - nz * sin_x
    nz_depth = ny * sin_x + nz * cos_x
    nx_screen = nx

    xs = np.round(x_screen * scale + offset[0]).astype(int)
    ys = np.round(-y_screen * scale + offset[1]).astype(int)

    h, w = depth_buf.shape
    valid = (xs >= 0) & (xs < w) & (ys >= 0) & (ys < h)

    # Key light direction (top-left, slightly front)
    light = np.array([-0.4, 0.75, 0.52], dtype=np.float32)
    light /= np.linalg.norm(light)

    sort_idx = np.argsort(z_depth)
    for idx in sort_idx:
        if not valid[idx]:
            continue
        xi = xs[idx]
        yi = ys[idx]
        zi = z_depth[idx]

        if zi > depth_buf[yi, xi]:
            depth_buf[yi, xi] = zi
            n_vec = np.array([nx_screen[idx], ny_screen[idx], nz_depth[idx]], dtype=np.float32)
            n_len = np.linalg.norm(n_vec)
            if n_len > 1e-4:
                n_vec /= n_len
                diffuse = np.dot(n_vec, light)
            else:
                diffuse = 0.2

            base_c = base_colors[idx][:3].astype(np.float32)
            # 3-tier lighting ramp
            if diffuse > 0.45:
                lit_c = np.clip(base_c * 1.25 + 25, 0, 255)
            elif diffuse < -0.15:
                lit_c = np.clip(base_c * 0.72 - 15, 0, 255)
            else:
                lit_c = base_c

            color_buf[yi, xi, :3] = lit_c.astype(np.uint8)
            color_buf[yi, xi, 3] = base_colors[idx][3]
            norm_buf[yi, xi] = n_vec

def post_process_pixel_sprite(
    color_buf: np.ndarray,
    depth_buf: np.ndarray,
    outline_dark: Tuple[int, int, int, int] = (12, 24, 38, 255),
    ground_y: int = 86
) -> Image.Image:
    arr = color_buf.copy()
    alpha = arr[:, :, 3] > 0
    if not np.any(alpha):
        return Image.fromarray(arr)

    # 1. Fill pinholes
    filled_alpha = scipy.ndimage.binary_fill_holes(alpha)
    holes = filled_alpha & (~alpha)
    if np.any(holes):
        indices = scipy.ndimage.distance_transform_edt(~alpha, return_distances=False, return_indices=True)
        arr[holes] = arr[indices[0][holes], indices[1][holes]]
        arr[holes, 3] = 255

    # 2. Outline contour
    eroded = scipy.ndimage.binary_erosion(filled_alpha, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]])
    outline_mask = filled_alpha & (~eroded)
    arr[outline_mask] = outline_dark

    # 3. Strict ground contact pinning
    ys = np.where(arr[:, :, 3] > 0)[0]
    if len(ys) > 0:
        max_y = ys[-1]
        shift = ground_y - max_y
        if shift != 0:
            arr = np.roll(arr, shift, axis=0)
            if shift > 0:
                arr[:shift, :, :] = 0
            else:
                arr[shift:, :, :] = 0

    return Image.fromarray(arr)
def build_player_3d_mesh():
    points = []
    base_colors = []
    normals = []

    C_HAIR_BASE = np.array([140, 68, 38, 255], dtype=np.uint8)
    C_SKIN_BASE = np.array([245, 208, 182, 255], dtype=np.uint8)
    C_EYE_DARK = np.array([24, 20, 28, 255], dtype=np.uint8)
    C_TUNIC_TEAL = np.array([45, 125, 138, 255], dtype=np.uint8)
    C_TUNIC_GOLD = np.array([235, 205, 135, 255], dtype=np.uint8)
    C_BELT_BROWN = np.array([105, 58, 32, 255], dtype=np.uint8)
    C_BUCKLE_GOLD = np.array([245, 210, 65, 255], dtype=np.uint8)
    C_PANTS_DARK = np.array([42, 50, 62, 255], dtype=np.uint8)
    C_BOOTS_LEATHER = np.array([115, 68, 38, 255], dtype=np.uint8)
    C_POUCH_LEATHER = np.array([125, 75, 42, 255], dtype=np.uint8)

    step = 0.55

    # 1. Head & Face (y: 84 to 108), radius ~10.5
    head_cy = 96.0
    for x in np.arange(-9.0, 9.1, step):
        for y in np.arange(85.0, 108.1, step):
            for z in np.arange(-9.0, 9.1, step):
                dx = x / 8.5
                dy = (y - head_cy) / 10.5
                dz = z / 8.5
                if dx*dx + dy*dy + dz*dz <= 1.0:
                    points.append([x, y, z])
                    normals.append([dx, dy, dz])

                    # Face on front (z > 2.5 and y between 88 and 101)
                    if z > 2.5 and 88.0 <= y <= 101.0 and abs(x) < 7.0:
                        if 95.0 <= y <= 97.0 and 2.5 <= abs(x) <= 4.5 and z > 6.0:
                            base_colors.append(C_EYE_DARK)
                        else:
                            base_colors.append(C_SKIN_BASE)
                    else:
                        base_colors.append(C_HAIR_BASE)

    # 2. Torso / Poncho (y: 44 to 85)
    for x in np.arange(-14.0, 14.1, step):
        for y in np.arange(44.0, 85.1, step):
            for z in np.arange(-8.0, 8.1, step):
                if y > 60.0:
                    rel = (y - 60.0) / 25.0
                    rx = 9.0 + 4.5 * rel
                    rz = 6.0 + 2.0 * rel
                else:
                    rel = (60.0 - y) / 16.0
                    rx = 9.0 + 3.0 * rel
                    rz = 6.0 + 1.5 * rel

                dx = x / rx
                dy = (y - 64.0) / 21.0
                dz = z / rz
                if dx*dx + dy*dy + dz*dz <= 1.0:
                    points.append([x, y, z])
                    normals.append([dx, 0.4, dz])

                    # Belt at y=57 to 61
                    if 57.0 <= y <= 61.0:
                        if z > (rz * 0.8) and abs(x) < 3.0:
                            base_colors.append(C_BUCKLE_GOLD)
                        else:
                            base_colors.append(C_BELT_BROWN)
                    elif y < 47.0:
                        base_colors.append(C_TUNIC_GOLD)
                    else:
                        base_colors.append(C_TUNIC_TEAL)

    # 3. Traveler Pouch on right hip (x > 9.0, y: 52 to 60, z: 0 to 4)
    for x in np.arange(8.5, 12.6, step):
        for y in np.arange(52.0, 60.1, step):
            for z in np.arange(0.5, 5.1, step):
                dx = (x - 10.5) / 2.0
                dy = (y - 56.0) / 4.0
                dz = (z - 2.8) / 2.2
                if dx*dx + dy*dy + dz*dz <= 1.0:
                    points.append([x, y, z])
                    normals.append([0.8, 0.2, 0.5])
                    base_colors.append(C_POUCH_LEATHER)

    # 4. Arms & Sleeves
    for side in [-1, 1]:
        for y in np.arange(48.0, 81.1, step):
            rel_arm = (81.0 - y) / 33.0
            ax = side * (11.5 + rel_arm * 2.0)
            az = -1.0 + rel_arm * 1.5
            for x in np.arange(ax - 2.5, ax + 2.6, step):
                for z in np.arange(az - 2.5, az + 2.6, step):
                    dx = (x - ax) / 2.2
                    dz = (z - az) / 2.2
                    if dx*dx + dz*dz <= 1.0:
                        points.append([x, y, z])
                        normals.append([side * 0.8, 0.2, dz])
                        if y < 53.0:
                            base_colors.append(C_SKIN_BASE)
                        else:
                            base_colors.append(C_TUNIC_TEAL)

    # 5. Legs / Pants (y: 20 to 45)
    for side in [-1, 1]:
        lx = side * 4.8
        for y in np.arange(20.0, 45.1, step):
            for x in np.arange(lx - 3.2, lx + 3.3, step):
                for z in np.arange(-3.2, 3.3, step):
                    dx = (x - lx) / 3.0
                    dz = z / 3.0
                    if dx*dx + dz*dz <= 1.0:
                        points.append([x, y, z])
                        normals.append([dx, 0.0, dz])
                        base_colors.append(C_PANTS_DARK)

    # 6. Leather Boots (y: 0 to 22)
    for side in [-1, 1]:
        bx = side * 5.0
        for y in np.arange(0.0, 22.1, step):
            for x in np.arange(bx - 3.8, bx + 3.9, step):
                for z in np.arange(-4.5, 6.0, step):
                    toe_ext = max(0.0, (10.0 - y) / 10.0) * 2.2
                    dx = (x - bx) / 3.5
                    dz = (z - toe_ext * 0.5) / (4.2 + toe_ext * 0.5)
                    if dx*dx + dz*dz <= 1.0:
                        points.append([x, y, z])
                        normals.append([dx, 0.2, dz])
                        base_colors.append(C_BOOTS_LEATHER)

    return np.array(points, dtype=np.float32), np.array(base_colors, dtype=np.uint8), np.array(normals, dtype=np.float32)

def build_rivallie_3d_mesh():
    points = []
    base_colors = []
    normals = []

    C_SCALE_BASE = np.array([38, 115, 165, 255], dtype=np.uint8)
    C_CREAM_BASE = np.array([230, 218, 185, 255], dtype=np.uint8)
    C_CREAM_SHADE = np.array([195, 178, 145, 255], dtype=np.uint8)
    C_CREST_AQUA = np.array([45, 195, 190, 255], dtype=np.uint8)
    C_EYE_GOLD = np.array([245, 195, 45, 255], dtype=np.uint8)
    C_EYE_DARK = np.array([18, 22, 32, 255], dtype=np.uint8)
    C_PAW_DARK = np.array([22, 65, 98, 255], dtype=np.uint8)

    step = 0.55

    # 1. Torso: Ellipsoid centered at (0, 16.0, 0), rx=10.5, ry=8.5, rz=15.0
    for x in np.arange(-11.0, 11.1, step):
        for y in np.arange(6.0, 25.1, step):
            for z in np.arange(-15.0, 14.1, step):
                dx = x / 10.5
                dy = (y - 15.5) / 8.5
                dz = (z + 0.5) / 14.5
                d_sq = dx*dx + dy*dy + dz*dz
                if d_sq <= 1.0:
                    points.append([x, y, z])
                    nx, ny, nz = dx / 10.5, dy / 8.5, dz / 14.5
                    n_len = np.sqrt(nx*nx + ny*ny + nz*nz)
                    normals.append([nx/n_len, ny/n_len, nz/n_len] if n_len > 1e-4 else [0, 1, 0])
                    if y < 14.0 and z > -9.0:
                        base_colors.append(C_CREAM_BASE if y > 9.5 else C_CREAM_SHADE)
                    else:
                        base_colors.append(C_SCALE_BASE)

    # 2. Snout & Head
    for x in np.arange(-7.0, 7.1, step):
        for y in np.arange(13.0, 27.5, step):
            for z in np.arange(11.0, 25.5, step):
                rel_z = max(0.0, min(1.0, (z - 11.0) / 13.5))
                rx = 6.2 * (1.0 - 0.42 * rel_z)
                ry = 5.8 * (1.0 - 0.32 * rel_z)
                yc = 20.2 - 2.2 * rel_z

                dx = x / rx
                dy = (y - yc) / ry
                dz = (z - 17.5) / 7.2
                if dx*dx + dy*dy + dz*dz <= 1.0:
                    points.append([x, y, z])
                    nx, ny, nz = dx / rx, dy / ry, dz / 7.2
                    n_len = np.sqrt(nx*nx + ny*ny + nz*nz)
                    normals.append([nx/n_len, ny/n_len, nz/n_len] if n_len > 1e-4 else [0, 1, 0])

                    if 17.0 <= z <= 19.5 and 19.5 <= y <= 22.0 and abs(x) >= (rx * 0.72):
                        base_colors.append(C_EYE_GOLD if (y >= 20.5 and abs(x) >= (rx * 0.82)) else C_EYE_DARK)
                    elif y < yc and rel_z > 0.25:
                        base_colors.append(C_CREAM_BASE)
                    else:
                        base_colors.append(C_SCALE_BASE)

    # 3. Ear Crest Fins
    for side in [-1, 1]:
        for u in np.arange(0, 6.5, step):
            for v in np.arange(0, 8.5, step):
                fx = side * (5.5 + u * 1.05)
                fy = 19.5 + v * 0.95 - u * 0.25
                fz = 13.5 - u * 0.75
                points.append([fx, fy, fz])
                normals.append([side * 0.65, 0.45, 0.6])
                base_colors.append(C_CREST_AQUA if v > 2.5 else C_SCALE_BASE)

    # 4. Four Paws
    paws = [
        (-7.0, 0.0, 8.5),   # FL
        (7.0, 0.0, 8.5),    # FR
        (-8.5, 0.0, -8.5),  # HL
        (8.5, 0.0, -8.5),   # HR
    ]
    for px, py, pz in paws:
        for x in np.arange(px - 3.2, px + 3.3, step):
            for y in np.arange(0.0, 8.5, step):
                for z in np.arange(pz - 3.2, pz + 3.3, step):
                    dx = (x - px) / 3.0
                    dy = y / 5.2
                    dz = (z - pz) / 3.0
                    if dx*dx + dy*dy + dz*dz <= 1.0:
                        points.append([x, y, z])
                        normals.append([dx, 0.3, dz])
                        base_colors.append(C_CREAM_SHADE if y < 2.5 else C_PAW_DARK)

    # 5. Broad Paddle Fan Tail
    for t in np.arange(0.0, 1.01, 0.04):
        tz = -14.0 - t * 18.0
        ty = 13.5 + np.sin(t * np.pi) * 3.5
        tw = 3.5 + 7.8 * np.sin(t * np.pi * 0.85) * (1.0 - t * 0.25)
        thickness = max(0.8, 2.2 * (1.0 - t * 0.75))

        for x in np.arange(-tw, tw + 0.1, step):
            for y in np.arange(ty - thickness, ty + thickness + 0.1, step):
                dx = x / tw
                dy = (y - ty) / thickness
                if dx*dx + dy*dy <= 1.0:
                    points.append([x, y, tz])
                    normals.append([dx * 0.5, 0.85, -0.2])
                    base_colors.append(C_CREST_AQUA if abs(x) > (tw * 0.72) else C_SCALE_BASE)

    return np.array(points, dtype=np.float32), np.array(base_colors, dtype=np.uint8), np.array(normals, dtype=np.float32)

def render_actor_8way(
    points: np.ndarray,
    colors: np.ndarray,
    normals: np.ndarray,
    target_canvas: Tuple[int, int],
    ground_anchor: Tuple[int, int],
    scale: float,
    tilt_x_deg: float = 20.0,
    outline_dark: Tuple[int, int, int, int] = (20, 24, 32, 255)
) -> List[Tuple[str, Image.Image]]:
    """
    Renders 8 continuous, zero-drift rotational facings:
    ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw']
    """
    angles = [0, 45, 90, 135, 180, 225, 270, 315]
    names = ["s", "se", "e", "ne", "n", "nw", "w", "sw"]
    tw, th = target_canvas
    gx, gy = ground_anchor

    results = []
    for deg, name in zip(angles, names):
        cbuf, dbuf, nbuf = create_zbuffer_canvas(tw, th)
        rasterize_lit_voxels(
            points=points,
            base_colors=colors,
            normals=normals,
            color_buf=cbuf,
            depth_buf=dbuf,
            norm_buf=nbuf,
            rot_y_deg=deg,
            tilt_x_deg=tilt_x_deg,
            scale=scale,
            offset=(gx, gy)
        )
        polished = post_process_pixel_sprite(
            color_buf=cbuf,
            depth_buf=dbuf,
            outline_dark=outline_dark,
            ground_y=gy
        )
        results.append((name, polished))

    return results
