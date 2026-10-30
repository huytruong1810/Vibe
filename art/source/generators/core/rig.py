"""
Hierarchical Joint Rig and Socket Definitions for Hearthwild Humanoids and Creatures.
Defines canonical 2D joint positions, build profiles, and attachment sockets for all 8 directions.
"""

from dataclasses import dataclass
from typing import Dict, Tuple, Optional

Vec2 = Tuple[int, int]

@dataclass(frozen=True)
class HumanoidJoints:
    root: Vec2           # Ground contact: (48, 132)
    pelvis: Vec2
    torso: Vec2
    neck: Vec2
    head: Vec2
    shoulder_l: Vec2
    elbow_l: Vec2
    wrist_l: Vec2
    shoulder_r: Vec2
    elbow_r: Vec2
    wrist_r: Vec2
    hip_l: Vec2
    knee_l: Vec2
    ankle_l: Vec2
    hip_r: Vec2
    knee_r: Vec2
    ankle_r: Vec2
    # Sockets for equipment/tools
    socket_dominant_hand: Vec2
    socket_support_hand: Vec2
    socket_back: Vec2
    socket_secondary: Vec2
    socket_headgear: Vec2

@dataclass(frozen=True)
class QuadrupedJoints:
    root: Vec2           # Ground contact: (48, 86)
    pelvis: Vec2
    chest: Vec2
    neck: Vec2
    head: Vec2
    muzzle: Vec2
    paw_front_l: Vec2
    paw_front_r: Vec2
    paw_back_l: Vec2
    paw_back_r: Vec2
    socket_crest: Vec2
    socket_tail: Vec2

# Canonical Human Root Anchor on 96x144 canvas
HUMAN_ROOT: Vec2 = (48, 132)
RIVALLIE_ROOT: Vec2 = (48, 86)

def get_humanoid_idle_pose(facing: str, build: str = "standard") -> HumanoidJoints:
    """
    Returns the joint hierarchy for a standing idle human in the given facing direction.
    build: 'slender', 'standard', 'sturdy'.
    """
    rx, ry = HUMAN_ROOT
    width_mod = -2 if build == "slender" else (3 if build == "sturdy" else 0)
    
    # Base height parameters
    pelvis_y = ry - 42
    torso_y = ry - 64
    neck_y = ry - 84
    head_y = ry - 100
    
    if facing == "s":
        return HumanoidJoints(
            root=(rx, ry),
            pelvis=(rx, pelvis_y),
            torso=(rx, torso_y),
            neck=(rx, neck_y),
            head=(rx, head_y),
            shoulder_l=(rx - 14 - width_mod, torso_y - 2),
            elbow_l=(rx - 16 - width_mod, torso_y + 16),
            wrist_l=(rx - 14 - width_mod, torso_y + 32),
            shoulder_r=(rx + 14 + width_mod, torso_y - 2),
            elbow_r=(rx + 16 + width_mod, torso_y + 16),
            wrist_r=(rx + 14 + width_mod, torso_y + 32),
            hip_l=(rx - 8 - width_mod // 2, pelvis_y + 2),
            knee_l=(rx - 8 - width_mod // 2, pelvis_y + 22),
            ankle_l=(rx - 8 - width_mod // 2, ry),
            hip_r=(rx + 8 + width_mod // 2, pelvis_y + 2),
            knee_r=(rx + 8 + width_mod // 2, pelvis_y + 22),
            ankle_r=(rx + 8 + width_mod // 2, ry),
            socket_dominant_hand=(rx + 14 + width_mod, torso_y + 34),
            socket_support_hand=(rx - 14 - width_mod, torso_y + 34),
            socket_back=(rx, torso_y - 4),
            socket_secondary=(rx - 10, pelvis_y + 4),
            socket_headgear=(rx, head_y - 12),
        )
    elif facing in ("se", "sw"):
        flip = 1 if facing == "se" else -1
        return HumanoidJoints(
            root=(rx, ry),
            pelvis=(rx, pelvis_y),
            torso=(rx, torso_y),
            neck=(rx + 2 * flip, neck_y),
            head=(rx + 3 * flip, head_y),
            shoulder_l=(rx - 12 * flip, torso_y - 2),
            elbow_l=(rx - 14 * flip, torso_y + 16),
            wrist_l=(rx - 11 * flip, torso_y + 32),
            shoulder_r=(rx + 15 * flip, torso_y - 2),
            elbow_r=(rx + 17 * flip, torso_y + 16),
            wrist_r=(rx + 14 * flip, torso_y + 32),
            hip_l=(rx - 6 * flip, pelvis_y + 2),
            knee_l=(rx - 6 * flip, pelvis_y + 22),
            ankle_l=(rx - 6 * flip, ry),
            hip_r=(rx + 9 * flip, pelvis_y + 2),
            knee_r=(rx + 9 * flip, pelvis_y + 22),
            ankle_r=(rx + 9 * flip, ry),
            socket_dominant_hand=(rx + 16 * flip, torso_y + 34),
            socket_support_hand=(rx - 11 * flip, torso_y + 34),
            socket_back=(rx - 4 * flip, torso_y - 4),
            socket_secondary=(rx - 8 * flip, pelvis_y + 4),
            socket_headgear=(rx + 3 * flip, head_y - 12),
        )
    elif facing in ("e", "w"):
        flip = 1 if facing == "e" else -1
        return HumanoidJoints(
            root=(rx, ry),
            pelvis=(rx, pelvis_y),
            torso=(rx, torso_y),
            neck=(rx + 3 * flip, neck_y),
            head=(rx + 4 * flip, head_y),
            shoulder_l=(rx - 3 * flip, torso_y - 2),
            elbow_l=(rx - 4 * flip, torso_y + 16),
            wrist_l=(rx - 2 * flip, torso_y + 32),
            shoulder_r=(rx + 4 * flip, torso_y - 2),
            elbow_r=(rx + 6 * flip, torso_y + 16),
            wrist_r=(rx + 4 * flip, torso_y + 32),
            hip_l=(rx - 4 * flip, pelvis_y + 2),
            knee_l=(rx - 4 * flip, pelvis_y + 22),
            ankle_l=(rx - 4 * flip, ry),
            hip_r=(rx + 5 * flip, pelvis_y + 2),
            knee_r=(rx + 5 * flip, pelvis_y + 22),
            ankle_r=(rx + 5 * flip, ry),
            socket_dominant_hand=(rx + 6 * flip, torso_y + 34),
            socket_support_hand=(rx - 2 * flip, torso_y + 34),
            socket_back=(rx - 6 * flip, torso_y - 4),
            socket_secondary=(rx - 6 * flip, pelvis_y + 4),
            socket_headgear=(rx + 4 * flip, head_y - 12),
        )
    else:  # North / Back views (n, ne, nw)
        flip = 1 if facing == "ne" else (-1 if facing == "nw" else 0)
        return HumanoidJoints(
            root=(rx, ry),
            pelvis=(rx, pelvis_y),
            torso=(rx, torso_y),
            neck=(rx + 2 * flip, neck_y),
            head=(rx + 2 * flip, head_y),
            shoulder_l=(rx - 14 - width_mod, torso_y - 2),
            elbow_l=(rx - 16 - width_mod, torso_y + 16),
            wrist_l=(rx - 14 - width_mod, torso_y + 32),
            shoulder_r=(rx + 14 + width_mod, torso_y - 2),
            elbow_r=(rx + 16 + width_mod, torso_y + 16),
            wrist_r=(rx + 14 + width_mod, torso_y + 32),
            hip_l=(rx - 8 - width_mod // 2, pelvis_y + 2),
            knee_l=(rx - 8 - width_mod // 2, pelvis_y + 22),
            ankle_l=(rx - 8 - width_mod // 2, ry),
            hip_r=(rx + 8 + width_mod // 2, pelvis_y + 2),
            knee_r=(rx + 8 + width_mod // 2, pelvis_y + 22),
            ankle_r=(rx + 8 + width_mod // 2, ry),
            socket_dominant_hand=(rx + 14 + width_mod, torso_y + 34),
            socket_support_hand=(rx - 14 - width_mod, torso_y + 34),
            socket_back=(rx, torso_y - 4),
            socket_secondary=(rx - 10, pelvis_y + 4),
            socket_headgear=(rx, head_y - 12),
        )

def get_rivallie_idle_pose(facing: str) -> QuadrupedJoints:
    """
    Returns quadruped joints for Rivallie (semi-aquatic otter) on 96x96 canvas at root (48, 86).
    """
    rx, ry = RIVALLIE_ROOT
    if facing == "s":
        return QuadrupedJoints(
            root=(rx, ry),
            pelvis=(rx, ry - 18),
            chest=(rx, ry - 36),
            neck=(rx, ry - 50),
            head=(rx, ry - 62),
            muzzle=(rx, ry - 58),
            paw_front_l=(rx - 14, ry),
            paw_front_r=(rx + 14, ry),
            paw_back_l=(rx - 18, ry - 4),
            paw_back_r=(rx + 18, ry - 4),
            socket_crest=(rx, ry - 66),
            socket_tail=(rx, ry - 14),
        )
    elif facing in ("se", "sw"):
        flip = 1 if facing == "se" else -1
        return QuadrupedJoints(
            root=(rx, ry),
            pelvis=(rx - 10 * flip, ry - 20),
            chest=(rx + 6 * flip, ry - 38),
            neck=(rx + 14 * flip, ry - 52),
            head=(rx + 22 * flip, ry - 60),
            muzzle=(rx + 28 * flip, ry - 58),
            paw_front_l=(rx + 2 * flip, ry),
            paw_front_r=(rx + 16 * flip, ry),
            paw_back_l=(rx - 20 * flip, ry),
            paw_back_r=(rx - 8 * flip, ry),
            socket_crest=(rx + 14 * flip, ry - 66),
            socket_tail=(rx - 24 * flip, ry - 26),
        )
    elif facing in ("e", "w"):
        flip = 1 if facing == "e" else -1
        return QuadrupedJoints(
            root=(rx, ry),
            pelvis=(rx - 12 * flip, ry - 22),
            chest=(rx + 8 * flip, ry - 38),
            neck=(rx + 16 * flip, ry - 52),
            head=(rx + 24 * flip, ry - 58),
            muzzle=(rx + 30 * flip, ry - 56),
            paw_front_l=(rx + 6 * flip, ry),
            paw_front_r=(rx + 18 * flip, ry),
            paw_back_l=(rx - 18 * flip, ry),
            paw_back_r=(rx - 8 * flip, ry),
            socket_crest=(rx + 14 * flip, ry - 66),
            socket_tail=(rx - 26 * flip, ry - 26),
        )
    else:  # North
        return QuadrupedJoints(
            root=(rx, ry),
            pelvis=(rx, ry - 20),
            chest=(rx, ry - 38),
            neck=(rx, ry - 52),
            head=(rx, ry - 64),
            muzzle=(rx, ry - 66),
            paw_front_l=(rx - 14, ry - 4),
            paw_front_r=(rx + 14, ry - 4),
            paw_back_l=(rx - 16, ry),
            paw_back_r=(rx + 16, ry),
            socket_crest=(rx, ry - 68),
            socket_tail=(rx, ry - 14),
        )
