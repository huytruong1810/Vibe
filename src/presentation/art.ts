import { Texture } from 'pixi.js';

/** Original code-drawn placeholder sprites. Replace textures without changing simulation. */
export class PixelArt {
  private readonly cache = new Map<string, Texture>();
  texture(
    key: string,
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): Texture {
    const cached = this.cache.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    context.imageSmoothingEnabled = false;
    draw(context);
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'nearest';
    this.cache.set(key, texture);
    return texture;
  }
  person(village: number, player = false): Texture {
    return this.texture(`person:${village}:${player}`, 16, 24, (c) => {
      const colors = ['#c98a69', '#78b5b8', '#c1bc80'];
      c.fillStyle = '#243c38';
      c.fillRect(4, 20, 3, 3);
      c.fillRect(9, 20, 3, 3);
      c.fillStyle = player ? '#dad0a8' : colors[village]!;
      c.fillRect(4, 11, 8, 10);
      c.fillRect(2, 12, 12, 5);
      c.fillStyle = player ? '#718e7a' : '#526e60';
      c.fillRect(4, 18, 8, 3);
      c.fillStyle = '#e4bb91';
      c.fillRect(4, 4, 8, 8);
      c.fillRect(2, 16, 2, 3);
      c.fillRect(12, 16, 2, 3);
      c.fillStyle = player ? '#6f5343' : ['#6d4c3f', '#3b5550', '#7d6950'][village]!;
      c.fillRect(3, 2, 10, 5);
      c.fillRect(3, 5, 2, 4);
      c.fillStyle = '#233f38';
      c.fillRect(6, 8, 1, 2);
      c.fillRect(10, 8, 1, 2);
      if (player) {
        c.fillStyle = '#9ca879';
        c.fillRect(1, 3, 14, 2);
        c.fillRect(4, 0, 8, 4);
        c.fillStyle = '#d6b46c';
        c.fillRect(3, 3, 9, 1);
      }
      c.fillStyle = '#ead8b3';
      c.fillRect(7, 12, 2, 3);
    });
  }
  creature(species: number, color: number): Texture {
    return this.texture(`creature:${species}`, 22, 24, (c) => {
      const hex = `#${color.toString(16).padStart(6, '0')}`;
      c.fillStyle = '#35534a';
      c.fillRect(5, 19, 4, 3);
      c.fillRect(14, 19, 4, 3);
      c.fillStyle = hex;
      c.fillRect(4, 9, 15, 10);
      c.fillRect(2, 12, 18, 5);
      c.fillRect(6, 7, 11, 3);
      if (species === 0) {
        c.fillStyle = '#b96852';
        c.fillRect(2, 5, 18, 5);
        c.fillRect(5, 2, 12, 4);
        c.fillStyle = '#f4d69d';
        c.fillRect(7, 4, 3, 2);
        c.fillRect(15, 6, 2, 2);
      } else if (species === 1) {
        c.fillRect(3, 3, 3, 9);
        c.fillRect(16, 3, 3, 9);
        c.fillStyle = '#d3e9cb';
        c.fillRect(6, 13, 10, 5);
      } else if (species === 2) {
        c.fillRect(4, 3, 4, 8);
        c.fillRect(14, 3, 4, 8);
        c.fillStyle = '#f0eac0';
        c.fillRect(8, 10, 7, 8);
        c.fillRect(1, 13, 4, 3);
      } else if (species === 3) {
        c.fillStyle = '#739769';
        c.fillRect(3, 5, 16, 5);
        c.fillRect(7, 2, 7, 4);
        c.fillStyle = '#dae1ad';
        c.fillRect(8, 6, 3, 2);
      } else if (species === 4) {
        c.fillStyle = '#dfa2a0';
        c.fillRect(0, 5, 7, 11);
        c.fillRect(15, 5, 7, 11);
        c.fillStyle = '#f1cd9d';
        c.fillRect(1, 7, 4, 5);
        c.fillRect(17, 7, 4, 5);
      } else if (species >= 6) {
        c.fillStyle = species === 6 ? '#b65c3d' : '#406d61';
        c.fillRect(2, 8, 18, 10);
        c.fillRect(1, 15, 3, 7);
        c.fillRect(17, 15, 3, 7);
        c.fillRect(3, 1, 4, 8);
        c.fillRect(15, 1, 4, 8);
        c.fillStyle = '#eed3a0';
        c.fillRect(7, 15, 9, 4);
        c.fillStyle = '#efead1';
        c.fillRect(8, 17, 2, 4);
        c.fillRect(13, 17, 2, 4);
      } else {
        c.fillStyle = '#8d87a6';
        c.fillRect(3, 8, 17, 9);
        c.fillStyle = '#d9c9d8';
        c.fillRect(6, 10, 11, 2);
        c.fillRect(10, 7, 3, 8);
        c.fillStyle = '#e0e5d7';
        c.fillRect(10, 1, 4, 3);
      }
      c.fillStyle = '#263f3a';
      c.fillRect(6, 12, 2, 2);
      c.fillRect(15, 12, 2, 2);
      c.fillStyle = '#f5edce';
      c.fillRect(6, 12, 1, 1);
      c.fillRect(15, 12, 1, 1);
    });
  }
  tree(variant: number): Texture {
    return this.texture(`tree:${variant}`, 38, 52, (c) => {
      c.fillStyle = '#795e47';
      c.fillRect(16, 29, 6, 21);
      c.fillStyle = '#ad8960';
      c.fillRect(19, 35, 2, 14);
      c.fillStyle = '#315a4a';
      c.fillRect(7, 14, 24, 24);
      c.fillRect(2, 22, 34, 10);
      c.fillRect(11, 5, 16, 12);
      c.fillStyle = variant ? '#5f8d63' : '#518766';
      c.fillRect(6, 16, 25, 14);
      c.fillRect(10, 9, 17, 11);
      c.fillRect(3, 23, 13, 7);
      c.fillStyle = variant ? '#8da768' : '#80a879';
      c.fillRect(10, 12, 9, 4);
      c.fillRect(6, 21, 7, 3);
      c.fillRect(20, 18, 7, 3);
      c.fillStyle = '#9bb47c';
      c.fillRect(12, 9, 5, 2);
      c.fillRect(5, 20, 3, 2);
    });
  }
  house(village: number): Texture {
    return this.texture(`house:${village}`, 56, 60, (c) => {
      c.fillStyle = '#46584a';
      c.fillRect(5, 52, 46, 5);
      c.fillStyle = ['#c4af89', '#c4ceb2', '#ded1a2'][village]!;
      c.fillRect(7, 26, 42, 27);
      c.fillStyle = '#9c9879';
      c.fillRect(7, 49, 42, 4);
      c.fillRect(7, 29, 3, 23);
      c.fillRect(46, 29, 3, 23);
      c.fillStyle = ['#a86553', '#658c87', '#899b71'][village]!;
      c.fillRect(2, 22, 52, 7);
      c.fillRect(6, 15, 44, 8);
      c.fillRect(11, 8, 34, 8);
      c.fillRect(17, 3, 22, 6);
      c.fillStyle = ['#d3966b', '#8fa79a', '#b1bc85'][village]!;
      for (let row = 0; row < 4; row++) c.fillRect(17 - row * 4, 5 + row * 6, 22 + row * 8, 2);
      c.fillStyle = '#617064';
      c.fillRect(23, 36, 11, 17);
      c.fillStyle = '#d5bb7c';
      c.fillRect(13, 35, 7, 9);
      c.fillRect(38, 35, 7, 9);
      c.fillStyle = '#f0dda3';
      c.fillRect(14, 36, 5, 6);
      c.fillRect(39, 36, 5, 6);
      c.fillStyle = '#7b8065';
      c.fillRect(16, 35, 1, 9);
      c.fillRect(41, 35, 1, 9);
      c.fillRect(12, 40, 9, 1);
      c.fillRect(37, 40, 9, 1);
      c.fillStyle = '#c5ac70';
      c.fillRect(31, 44, 1, 2);
      c.fillStyle = '#bcb48a';
      c.fillRect(20, 53, 17, 3);
      c.fillStyle = '#686c5b';
      c.fillRect(39, 2, 6, 14);
      c.fillStyle = '#a69f82';
      c.fillRect(38, 1, 8, 3);
    });
  }
  resource(kind: number): Texture {
    return this.texture(`resource:${kind}`, 18, 20, (c) => {
      if ([0, 1, 2, 3, 4, 5].includes(kind)) {
        c.fillStyle = '#496e4c';
        c.fillRect(3, 11, 12, 6);
        c.fillRect(1, 13, 15, 3);
        c.fillRect(6, 8, 7, 5);
        if (kind === 0) {
          c.fillStyle = '#cd7874';
          c.fillRect(5, 11, 3, 3);
          c.fillRect(11, 13, 3, 3);
          c.fillRect(9, 8, 3, 3);
        } else if (kind === 1 || kind === 2 || kind === 4) {
          c.fillStyle = kind === 4 ? '#bd956b' : '#d4bf7a';
          c.fillRect(5, 2, 1, 13);
          c.fillRect(10, 0, 1, 15);
          c.fillRect(13, 4, 1, 11);
          c.fillRect(4, 2, 3, 4);
          c.fillRect(9, 0, 3, 4);
        } else {
          c.fillStyle = kind === 3 ? '#dfadba' : '#b9a4c8';
          c.fillRect(4, 7, 5, 4);
          c.fillRect(11, 9, 5, 4);
          c.fillStyle = '#ead3bd';
          c.fillRect(6, 8, 1, 1);
        }
      } else if (kind === 7) {
        c.fillStyle = '#876749';
        c.fillRect(2, 14, 14, 3);
        c.fillRect(10, 9, 3, 7);
        c.fillStyle = '#b19568';
        c.fillRect(3, 14, 10, 1);
      } else if (kind === 8) {
        c.fillStyle = '#c6c493';
        c.fillRect(4, 10, 10, 6);
        c.fillStyle = '#8d9d71';
        c.fillRect(6, 11, 2, 5);
        c.fillRect(10, 10, 2, 5);
      } else {
        c.fillStyle = '#7c8d82';
        c.fillRect(3, 10, 12, 7);
        c.fillRect(5, 7, 8, 4);
        c.fillStyle = kind === 13 ? '#c28c68' : '#b7beb0';
        c.fillRect(5, 8, 7, 3);
        c.fillRect(4, 11, 3, 2);
      }
    });
  }
  light(): Texture {
    return this.texture('light', 96, 96, (c) => {
      for (let radius = 48; radius > 0; radius -= 4) {
        c.fillStyle = `rgba(255,214,141,${0.012 + ((48 - radius) / 48) * 0.018})`;
        c.fillRect(48 - radius, 48 - radius, radius * 2, radius * 2);
      }
    });
  }
  cliff(color: number, height: number): Texture {
    return this.texture(`cliff:${color}:${height}`, 16, height, (c) => {
      c.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      c.fillRect(0, 0, 16, height);
      c.fillStyle = '#263f3655';
      c.fillRect(0, 1, 16, height - 1);
      c.fillStyle = '#d8c49d77';
      c.fillRect(0, 0, 16, 1);
      c.fillStyle = '#304a3e66';
      c.fillRect(5, 2, 1, height - 2);
      c.fillRect(12, 1, 1, height - 1);
    });
  }
  landmark(kind: 'waystone' | 'well' | 'flowers' | 'lantern' | 'fence'): Texture {
    return this.texture(`landmark:${kind}`, 28, 36, (c) => {
      if (kind === 'well') {
        c.fillStyle = '#5e7f76';
        c.fillRect(3, 22, 22, 12);
        c.fillStyle = '#a4b8a0';
        c.fillRect(1, 20, 26, 5);
        c.fillStyle = '#497d7d';
        c.fillRect(7, 20, 14, 3);
        c.fillStyle = '#aa9271';
        c.fillRect(4, 10, 3, 13);
        c.fillRect(21, 10, 3, 13);
        c.fillStyle = '#6b9080';
        c.fillRect(1, 9, 26, 4);
        c.fillRect(5, 5, 18, 5);
        c.fillRect(10, 2, 8, 3);
      } else if (kind === 'waystone') {
        c.fillStyle = '#617b6c';
        c.fillRect(5, 28, 18, 6);
        c.fillRect(9, 6, 10, 24);
        c.fillStyle = '#9eac8b';
        c.fillRect(9, 5, 10, 3);
        c.fillRect(8, 12, 3, 17);
        c.fillStyle = '#d7ca8a';
        c.fillRect(13, 11, 3, 3);
        c.fillRect(12, 17, 5, 2);
        c.fillRect(14, 16, 1, 5);
      } else if (kind === 'flowers') {
        c.fillStyle = '#5d8056';
        c.fillRect(2, 27, 24, 7);
        c.fillStyle = '#92b276';
        c.fillRect(4, 23, 2, 10);
        c.fillRect(12, 21, 2, 11);
        c.fillRect(21, 25, 2, 8);
        for (const [x, y, color] of [
          [3, 21, '#e6c085'],
          [11, 19, '#db9d9d'],
          [20, 23, '#d5c5d0'],
        ] as const) {
          c.fillStyle = color;
          c.fillRect(x, y, 4, 4);
          c.fillStyle = '#efe0b0';
          c.fillRect(x + 1, y + 1, 2, 2);
        }
      } else if (kind === 'lantern') {
        c.fillStyle = '#6d7054';
        c.fillRect(13, 5, 2, 30);
        c.fillRect(10, 2, 10, 2);
        c.fillStyle = '#b49f65';
        c.fillRect(17, 4, 7, 11);
        c.fillStyle = '#e5cd86';
        c.fillRect(18, 6, 5, 6);
        c.fillStyle = '#eef0b5';
        c.fillRect(20, 7, 2, 3);
      } else {
        c.fillStyle = '#ac9a6d';
        c.fillRect(2, 23, 24, 3);
        c.fillRect(2, 29, 24, 3);
        c.fillRect(3, 19, 3, 16);
        c.fillRect(22, 19, 3, 16);
        c.fillStyle = '#d2be85';
        c.fillRect(3, 19, 3, 2);
        c.fillRect(22, 19, 3, 2);
      }
    });
  }
  dispose(): void {
    for (const texture of this.cache.values()) texture.destroy(true);
    this.cache.clear();
  }
}
