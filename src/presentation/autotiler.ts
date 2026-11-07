export class DualGridAutotiler {
  private static readonly patterns = Array.from({ length: 16 }, (_, mask) => {
    const rects: { x: number; y: number; width: number; height: number }[] = [];
    for (let y = 0; y < 16; y += 2) {
      let start = -1;
      for (let x = 0; x <= 16; x += 2) {
        const u = (x + 1) / 16,
          v = (y + 1) / 16;
        const weight =
          (mask & 1 ? (1 - u) * (1 - v) : 0) +
          (mask & 2 ? u * (1 - v) : 0) +
          (mask & 4 ? (1 - u) * v : 0) +
          (mask & 8 ? u * v : 0);
        const inside = x < 16 && weight >= 0.5;
        if (inside && start < 0) start = x;
        if (!inside && start >= 0) {
          rects.push({ x: start, y, width: x - start, height: 2 });
          start = -1;
        }
      }
    }
    return rects;
  });
  pattern(mask: number): readonly { x: number; y: number; width: number; height: number }[] {
    return DualGridAutotiler.patterns[mask & 15]!;
  }
  /** Bits are NW=1, NE=2, SW=4, SE=8. Shared corner samples remove chunk seams. */
  mask(
    world: { readonly size: number; index(x: number, y: number): number },
    x: number,
    y: number,
    matches: (index: number) => boolean,
  ): number {
    let mask = 0;
    for (let corner = 0; corner < 4; corner++) {
      const cx = x + (corner % 2),
        cy = y + Math.floor(corner / 2);
      if (cx >= 0 && cy >= 0 && cx < world.size && cy < world.size && matches(world.index(cx, cy)))
        mask |= 1 << corner;
    }
    return mask;
  }
}
