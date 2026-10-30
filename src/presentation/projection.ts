/** Presentation pixels never enter navigation, damage, physiology, or saves. */
export interface RenderProfile {
  readonly width: number;
  readonly height: number;
  readonly tilePixels: number;
  readonly elevationPixels: number;
  readonly cacheRegionTiles: number;
  readonly humanHeight: number;
}
export const HD_PROFILE: RenderProfile = Object.freeze({
  width: 1920,
  height: 1080,
  tilePixels: 64,
  elevationPixels: 16,
  cacheRegionTiles: 16,
  humanHeight: 144,
});
export interface Point {
  readonly x: number;
  readonly y: number;
}
export class WorldProjection {
  constructor(readonly profile: RenderProfile = HD_PROFILE) {}
  world(x: number, y: number, elevation = 0): Point {
    return {
      x: x * this.profile.tilePixels,
      y: y * this.profile.tilePixels - elevation * this.profile.elevationPixels,
    };
  }
  screen(x: number, y: number, elevation: number, camera: Point): Point {
    const p = this.world(x, y, elevation);
    return { x: p.x - camera.x, y: p.y - camera.y };
  }
  /** Inverts a known walk surface; picking tests all elevations instead of assuming ground. */
  unproject(x: number, y: number, camera: Point, elevation = 0): Point {
    return {
      x: (x + camera.x) / this.profile.tilePixels,
      y: (y + camera.y + elevation * this.profile.elevationPixels) / this.profile.tilePixels,
    };
  }
  client(client: Point, rect: { left: number; top: number; width: number; height: number }): Point {
    return {
      x: ((client.x - rect.left) * this.profile.width) / Math.max(1, rect.width),
      y: ((client.y - rect.top) * this.profile.height) / Math.max(1, rect.height),
    };
  }
  fit(width: number, height: number): { width: number; height: number } {
    const scale = Math.min(width / this.profile.width, height / this.profile.height);
    return {
      width: Math.max(1, this.profile.width * scale),
      height: Math.max(1, this.profile.height * scale),
    };
  }
  depth(y: number, id: number): number {
    return y * this.profile.tilePixels + (id / 0x100000000) * 0.001;
  }
}
export class CameraController {
  x = 0;
  y = 0;
  initialized = false;
  constructor(readonly projection = new WorldProjection()) {}
  follow(x: number, y: number, elevation: number, dt: number): void {
    const p = this.projection.world(x, y, elevation),
      profile = this.projection.profile;
    const tx = p.x - profile.width / 2,
      ty = p.y - profile.height / 2;
    if (!this.initialized) {
      this.x = tx;
      this.y = ty;
      this.initialized = true;
    }
    const factor = 1 - Math.exp(-Math.max(0, dt) * 10);
    this.x += (tx - this.x) * factor;
    this.y += (ty - this.y) * factor;
  }
}
