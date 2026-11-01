"""Shared composition invariants; synthetic fixture images are not production artwork."""
import json
import sys
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from worldlib.terrain import CatalogTileSet, variant_of
from worldlib.project import REPO


class Art:
    def __init__(self):
        self.images = {"ground_grass": Image.new("RGBA", (32,32), "green"),
                       "ground_grass_v1": Image.new("RGBA", (32,32), "red"),
                       "ground_freshwater": Image.new("RGBA", (32,32), "blue"),
                       "path_stone_mask_1": Image.new("RGBA", (32,32), (100,100,100,255))}
        self.content_ids = frozenset(self.images)
    def asset(self, name):
        return (self.images[name], {"x":0.5,"y":0.5}) if name in self.images else None


class TerrainComposition(unittest.TestCase):
    def test_shared_hash_vectors(self):
        for row in json.loads((REPO/'tests/fixtures/terrain-variants.json').read_text()):
            self.assertEqual(variant_of(row['x'],row['y'],row['count']),row['variant'])

    def test_variant_origin_is_world_based_and_repeatable(self):
        art=Art()
        tiles=CatalogTileSet(art,{}, {})
        self.addCleanup(tiles.close)
        ground=np.full((3,4),'ground_grass',object)
        a=tiles.compose(ground,[],origin=(31,32))
        self.addCleanup(a.close)
        for y in range(3):
            for x in range(4):
                expected=art.images['ground_grass_v1' if variant_of(x+31,y+32,2) else 'ground_grass']
                self.assertEqual(a.getpixel((x*32+16,y*32+16)),expected.getpixel((16,16)))
        b=tiles.compose(ground,[],origin=(31,32))
        self.addCleanup(b.close)
        self.assertEqual(a.tobytes(),b.tobytes())

    def test_transparent_masks_and_missing_art_have_bounded_fallbacks(self):
        art=Art()
        overlays={'path':{'material':'ground_stone','layer':'paths'}}
        tiles=CatalogTileSet(art,{'ground_stone':'#646464'},overlays)
        self.addCleanup(tiles.close)
        self.assertEqual(tiles.overlay('path',1).getpixel((0,0)),(100,100,100,255))
        fallback=tiles.overlay('path',2)
        self.assertEqual(fallback.getpixel((0,31))[3],0)
        self.assertEqual(fallback.getpixel((31,0)),(100,100,100,255))

    def test_fluid_is_over_ground_and_paths_are_over_fluid(self):
        art=Art()
        overlays={'water':{'material':'ground_freshwater','layer':'water'},
                  'path':{'material':'ground_stone','layer':'paths'}}
        tiles=CatalogTileSet(art,{'ground_stone':'#646464'},overlays)
        self.addCleanup(tiles.close)
        ground=np.full((3,3),'ground_grass',object)
        cells=np.ones((3,3),bool)
        a=tiles.compose(ground,[('water',cells),('path',cells)])
        self.addCleanup(a.close)
        self.assertEqual(a.getpixel((48,48)),(100,100,100,255))

    def test_tile_tool_changes_invalidate_world_render_dependencies(self):
        from worldlib.review import dependencies
        from unittest.mock import patch
        target = REPO/'art/source/tiles/tools/tilelib/preview.py'
        original = Path.read_bytes
        before = dependencies()
        def changed(path):
            return original(path) + (b'\n# changed fixture\n' if path == target else b'')
        with patch.object(Path, 'read_bytes', new=changed):
            self.assertNotEqual(before, dependencies())
