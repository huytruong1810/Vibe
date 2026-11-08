"""Render the golden terrain in isolated scratch space; never publish or approve it."""
import sys
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from worldlib.project import REPO, PROJECT, read
from worldlib.review import PreviewArt, draw_level


def main(folder):
    folder = Path(folder).resolve()
    if not folder.is_relative_to(REPO / '.cache') or not folder.name.startswith('c11b-proof-'):
        raise ValueError('Proof output must be its isolated C11b scratch directory')
    class ProofArt(PreviewArt):
        def __init__(self):
            super().__init__()
            self.proof = {}
            for path in sorted((folder/'input/terrain{tps}').glob('*.png')):
                with Image.open(path) as image:
                    image = image.convert('RGBA')
                    self.proof[path.stem.removeprefix('c11b_')] = image.resize((image.width//2,image.height//2),Image.Resampling.NEAREST)
            self.content_ids = frozenset(self.content_ids | self.proof.keys())
        def asset(self, name):
            return (self.proof[name], {'x':0.5,'y':0.5}) if name in self.proof else super().asset(name)
        def close(self):
            for image in self.proof.values(): image.close()
            super().close()
    art = ProofArt()
    level = next(l for l in read(PROJECT)['levels'] if l['identifier']=='aqualia_village')
    image = draw_level(level, art)
    image.save(folder/'village.png')
    image.crop((28*32,16*32,28*32+960,16*32+540)).save(folder/'village-screen.png')
    image.close()
    art.close()


if __name__ == '__main__': main(sys.argv[1])
