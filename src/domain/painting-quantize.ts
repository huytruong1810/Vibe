import spec from '../content/palette.json' with { type: 'json' };

export const PAINTING_WIDTH = 48;
export const PAINTING_HEIGHT = 32;
export interface QuantizedPainting {
  readonly pixels: string;
  readonly palette: readonly string[];
}
type Color = readonly [number, number, number];
const linear = Float64Array.from({ length: 256 }, (_, n) => {
  const s = n / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
});
const rgb = (hex: string): Color => [
  linear[parseInt(hex.slice(1, 3), 16)]!,
  linear[parseInt(hex.slice(3, 5), 16)]!,
  linear[parseInt(hex.slice(5, 7), 16)]!,
];
function lab(r: number, g: number, b: number): Color {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const outline = new Set(
  Object.entries(spec.ramps)
    .filter(([name]) => name.startsWith('outline-'))
    .flatMap(([, ramp]) => Object.values(ramp.steps)),
);
export const PAINTING_COLORS = [
  ...new Set(Object.values(spec.ramps).flatMap((ramp) => Object.values(ramp.steps))),
].filter((color) => !outline.has(color));
const colors = PAINTING_COLORS.map((color) => lab(...rgb(color)));
// Paintings have no alpha channel: composite transparency onto palette paper in linear light.
const paper = rgb(spec.ramps.cream.steps.mid);
function nearest(color: Color, candidates: readonly number[]): number {
  let best = candidates[0]!,
    distance = Infinity;
  for (const index of candidates) {
    const other = colors[index]!;
    const d = (color[0] - other[0]) ** 2 + (color[1] - other[1]) ** 2 + (color[2] - other[2]) ** 2;
    if (d < distance) {
      best = index;
      distance = d;
    }
  }
  return best;
}
const all = colors.map((_, index) => index);
// Exact balanced colour-space search; the palette's original index breaks equal-distance ties.
const treeLeft = new Int16Array(colors.length).fill(-1);
const treeRight = new Int16Array(colors.length).fill(-1);
const treeAxis = new Uint8Array(colors.length);
function buildTree(indices: number[], depth = 0): number {
  if (!indices.length) return -1;
  const axis = depth % 3;
  indices.sort((a, b) => colors[a]![axis]! - colors[b]![axis]! || a - b);
  const middle = indices.length >> 1,
    index = indices[middle]!;
  treeAxis[index] = axis;
  treeLeft[index] = buildTree(indices.slice(0, middle), depth + 1);
  treeRight[index] = buildTree(indices.slice(middle + 1), depth + 1);
  return index;
}
const treeRoot = buildTree([...all]);
function nearestAll(color: Color, stack: Int16Array, bounds: Float64Array): number {
  let size = 1,
    best = 0,
    distance = Infinity;
  stack[0] = treeRoot;
  bounds[0] = 0;
  while (size) {
    const slot = --size,
      index = stack[slot]!,
      bound = bounds[slot]!;
    if (bound > distance) continue;
    const other = colors[index]!,
      dr = color[0] - other[0],
      dg = color[1] - other[1],
      db = color[2] - other[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < distance || (d === distance && index < best)) {
      best = index;
      distance = d;
    }
    const delta = color[treeAxis[index]!]! - other[treeAxis[index]!]!;
    const near = delta < 0 ? treeLeft[index]! : treeRight[index]!,
      far = delta < 0 ? treeRight[index]! : treeLeft[index]!;
    if (far >= 0) {
      stack[size] = far;
      bounds[size++] = Math.max(bound, delta * delta);
    }
    if (near >= 0) {
      stack[size] = near;
      bounds[size++] = bound;
    }
  }
  return best;
}
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64(bytes: Uint8Array): string {
  let result = '';
  for (let n = 0; n < bytes.length; n += 3) {
    const bits = (bytes[n]! << 16) | (bytes[n + 1]! << 8) | bytes[n + 2]!;
    result +=
      alphabet[(bits >>> 18) & 63]! +
      alphabet[(bits >>> 12) & 63]! +
      alphabet[(bits >>> 6) & 63]! +
      alphabet[bits & 63]!;
  }
  return result;
}

/** Centre crop, linear-light area average and palette mapping. No browser state or dithering. */
export function quantizePainting(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): QuantizedPainting {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 2048 ||
    height > 2048 ||
    rgba.length !== width * height * 4
  )
    throw Error('Invalid painting dimensions or RGBA length');
  const cropWidth = Math.min(width, height * 1.5),
    cropHeight = cropWidth / 1.5;
  const left = (width - cropWidth) / 2,
    top = (height - cropHeight) / 2;
  const dx = cropWidth / PAINTING_WIDTH,
    dy = cropHeight / PAINTING_HEIGHT;
  const area = dx * dy,
    mapped = new Uint16Array(PAINTING_WIDTH * PAINTING_HEIGHT);
  const counts = new Uint16Array(colors.length);
  const stack = new Int16Array(colors.length),
    bounds = new Float64Array(colors.length);
  // Source overlap is shared by every row and column. Avoid recomputing box intersections per channel/pixel.
  const footprints = Array.from({ length: PAINTING_WIDTH }, (_, x) => {
    const x0 = left + x * dx,
      x1 = left + (x + 1) * dx;
    const start = Math.floor(x0),
      end = Math.min(width, Math.ceil(x1));
    return {
      start,
      weights: Float64Array.from({ length: end - start }, (_, offset) => {
        const sx = start + offset;
        return Math.min(x1, sx + 1) - Math.max(x0, sx);
      }),
    };
  });
  const yFootprints = Array.from({ length: PAINTING_HEIGHT }, (_, y) => {
    const y0 = top + y * dy,
      y1 = top + (y + 1) * dy;
    const start = Math.floor(y0),
      end = Math.min(height, Math.ceil(y1));
    return {
      start,
      weights: Float64Array.from({ length: end - start }, (_, offset) => {
        const sy = start + offset;
        return Math.min(y1, sy + 1) - Math.max(y0, sy);
      }),
    };
  });
  const paperR = paper[0],
    paperG = paper[1],
    paperB = paper[2],
    invArea = 1 / area;
  for (let y = 0; y < PAINTING_HEIGHT; y++) {
    const yFootprint = yFootprints[y]!,
      yStart = yFootprint.start,
      yWeights = yFootprint.weights,
      yLen = yWeights.length,
      rowOffset = y * PAINTING_WIDTH;
    for (let x = 0; x < PAINTING_WIDTH; x++) {
      const footprint = footprints[x]!,
        xStart = footprint.start,
        xWeights = footprint.weights,
        xLen = xWeights.length;
      let red = 0,
        green = 0,
        blue = 0;
      for (let yi = 0; yi < yLen; yi++) {
        const wy = yWeights[yi]!;
        let n = ((yStart + yi) * width + xStart) * 4;
        for (let offset = 0; offset < xLen; offset++, n += 4) {
          const weight = wy * xWeights[offset]!,
            a8 = rgba[n + 3]!;
          if (a8 === 255) {
            red += linear[rgba[n]!]! * weight;
            green += linear[rgba[n + 1]!]! * weight;
            blue += linear[rgba[n + 2]!]! * weight;
          } else {
            const alpha = a8 / 255,
              invAlpha = 1 - alpha;
            red += (linear[rgba[n]!]! * alpha + paperR * invAlpha) * weight;
            green += (linear[rgba[n + 1]!]! * alpha + paperG * invAlpha) * weight;
            blue += (linear[rgba[n + 2]!]! * alpha + paperB * invAlpha) * weight;
          }
        }
      }
      const index = nearestAll(lab(red * invArea, green * invArea, blue * invArea), stack, bounds);
      mapped[rowOffset + x] = index;
      counts[index] = counts[index]! + 1;
    }
  }
  // Every destination cell has equal crop area. Stable palette order breaks frequency/distance ties.
  const kept = all
    .filter((index) => counts[index]! > 0)
    .sort((a, b) => counts[b]! - counts[a]! || a - b)
    .slice(0, 16)
    .sort((a, b) => a - b);
  const remap = new Uint8Array(colors.length);
  for (let index = 0; index < colors.length; index++)
    if (counts[index]! > 0) remap[index] = kept.indexOf(nearest(colors[index]!, kept));
  const packed = new Uint8Array(mapped.length / 2);
  for (let n = 0; n < mapped.length; n++)
    packed[n >> 1] = packed[n >> 1]! | (remap[mapped[n]!]! << (n % 2 ? 0 : 4));
  return { pixels: base64(packed), palette: kept.map((index) => PAINTING_COLORS[index]!) };
}
