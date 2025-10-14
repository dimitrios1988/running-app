export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex: ${hex}`);
  }
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// --- CSS filter simulator (approx) ---
type Vec3 = [number, number, number];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

// CSS filters operate on sRGB in [0..1]
function applyInvert(rgb: Vec3, a: number): Vec3 {
  // invert(a): mix between identity and full invert
  return [
    (1 - a) * rgb[0] + a * (1 - rgb[0]),
    (1 - a) * rgb[1] + a * (1 - rgb[1]),
    (1 - a) * rgb[2] + a * (1 - rgb[2]),
  ];
}

function applyBrightness(rgb: Vec3, b: number): Vec3 {
  return [clamp01(rgb[0] * b), clamp01(rgb[1] * b), clamp01(rgb[2] * b)];
}

function applyContrast(rgb: Vec3, c: number): Vec3 {
  // contrast(c): (x - .5)*c + .5
  return [
    clamp01((rgb[0] - 0.5) * c + 0.5),
    clamp01((rgb[1] - 0.5) * c + 0.5),
    clamp01((rgb[2] - 0.5) * c + 0.5),
  ];
}

// Matrices based on CSS Filter spec coefficients (rounded)
const Lr = 0.213,
  Lg = 0.715,
  Lb = 0.072;

function applySaturate(rgb: Vec3, s: number): Vec3 {
  const a = 1 - s;
  const r =
    (Lr + a * (1 - Lr)) * rgb[0] +
    (Lg - Lg * a) * rgb[1] +
    (Lb - Lb * a) * rgb[2];
  const g =
    (Lr - Lr * a) * rgb[0] +
    (Lg + a * (1 - Lg)) * rgb[1] +
    (Lb - Lb * a) * rgb[2];
  const b =
    (Lr - Lr * a) * rgb[0] +
    (Lg - Lg * a) * rgb[1] +
    (Lb + a * (1 - Lb)) * rgb[2];
  return [clamp01(r), clamp01(g), clamp01(b)];
}

function applySepia(rgb: Vec3, a: number): Vec3 {
  // sepia(a) = (1-a)*I + a*Sepia1
  // Sepia1 matrix:
  // [0.393,0.769,0.189; 0.349,0.686,0.168; 0.272,0.534,0.131]
  const ir = rgb[0],
    ig = rgb[1],
    ib = rgb[2];
  const r = (1 - a) * ir + a * (0.393 * ir + 0.769 * ig + 0.189 * ib);
  const g = (1 - a) * ig + a * (0.349 * ir + 0.686 * ig + 0.168 * ib);
  const b = (1 - a) * ib + a * (0.272 * ir + 0.534 * ig + 0.131 * ib);
  return [clamp01(r), clamp01(g), clamp01(b)];
}

function applyHueRotate(rgb: Vec3, deg: number): Vec3 {
  const rad = ((deg % 360) * Math.PI) / 180;
  const cos = Math.cos(rad),
    sin = Math.sin(rad);
  // CSS spec hue-rotate matrix (rounded luma coefficients)
  const m00 = Lr + (1 - Lr) * cos - Lr * sin;
  const m01 = Lg - Lg * cos - Lg * sin;
  const m02 = Lb - Lb * cos + (1 - Lb) * sin;

  const m10 = Lr - Lr * cos + 0.143 * sin;
  const m11 = Lg + (1 - Lg) * cos + 0.14 * sin;
  const m12 = Lb - Lb * cos - 0.283 * sin;

  const m20 = Lr - Lr * cos - (1 - Lr) * sin;
  const m21 = Lg - Lg * cos + Lg * sin;
  const m22 = Lb + (1 - Lb) * cos + Lb * sin;

  const r = clamp01(m00 * rgb[0] + m01 * rgb[1] + m02 * rgb[2]);
  const g = clamp01(m10 * rgb[0] + m11 * rgb[1] + m12 * rgb[2]);
  const b = clamp01(m20 * rgb[0] + m21 * rgb[1] + m22 * rgb[2]);
  return [r, g, b];
}

function simulate(filters: Filters, base: Vec3 = [0, 0, 0]): Vec3 {
  let c = base as Vec3;
  c = applyInvert(c, filters.invert);
  c = applySepia(c, filters.sepia);
  c = applySaturate(c, filters.saturate);
  c = applyHueRotate(c, filters.hue);
  c = applyBrightness(c, filters.brightness);
  c = applyContrast(c, filters.contrast);
  return c;
}

function loss(target: Vec3, cand: Vec3): number {
  const dr = target[0] - cand[0],
    dg = target[1] - cand[1],
    db = target[2] - cand[2];
  return dr * dr + dg * dg + db * db;
}

type Filters = {
  invert: number; // 0..1
  sepia: number; // 0..1
  saturate: number; // 0..8   (== 0..800%)
  hue: number; // -180..180 (deg)
  brightness: number; // 0.5..2
  contrast: number; // 0.5..2
};

function clampFilters(f: Filters): Filters {
  return {
    invert: clamp(f.invert, 0, 1),
    sepia: clamp(f.sepia, 0, 1),
    saturate: clamp(f.saturate, 0, 8),
    hue: clamp(f.hue, -180, 180),
    brightness: clamp(f.brightness, 0.5, 2),
    contrast: clamp(f.contrast, 0.5, 2),
  };
}

/**
 * Find a filter stack that approximates the target color when applied to black.
 * Lightweight SPSA optimizer (few iterations = fast, decent).
 */
function solveFilters(
  targetRgb: Rgb,
  iters = 220
): { filters: Filters; outRgb: Rgb; css: string; loss: number } {
  const target: Vec3 = [
    targetRgb.r / 255,
    targetRgb.g / 255,
    targetRgb.b / 255,
  ];

  // init guess
  let f: Filters = {
    invert: 0.5,
    sepia: 0.2,
    saturate: 2.5,
    hue: 0,
    brightness: 1.0,
    contrast: 1.0,
  };
  let best = { ...f },
    bestLoss = Infinity;

  // SPSA hyperparams
  const a0 = 0.75,
    c0 = 0.2; // step sizes
  const alpha = 0.602,
    gamma = 0.101; // decay

  for (let k = 0; k < iters; k++) {
    const ak = a0 / Math.pow(k + 1, alpha);
    const ck = c0 / Math.pow(k + 1, gamma);

    const delta: Filters = {
      invert: Math.random() < 0.5 ? -1 : 1,
      sepia: Math.random() < 0.5 ? -1 : 1,
      saturate: Math.random() < 0.5 ? -1 : 1,
      hue: Math.random() < 0.5 ? -1 : 1,
      brightness: Math.random() < 0.5 ? -1 : 1,
      contrast: Math.random() < 0.5 ? -1 : 1,
    };

    const fPlus: Filters = clampFilters({
      invert: f.invert + ck * delta.invert,
      sepia: f.sepia + ck * delta.sepia,
      saturate: f.saturate + ck * delta.saturate * 2, // let saturate move a bit more
      hue: f.hue + ck * delta.hue * 60, // bigger steps in hue
      brightness: f.brightness + ck * delta.brightness,
      contrast: f.contrast + ck * delta.contrast,
    });

    const fMinus: Filters = clampFilters({
      invert: f.invert - ck * delta.invert,
      sepia: f.sepia - ck * delta.sepia,
      saturate: f.saturate - ck * delta.saturate * 2,
      hue: f.hue - ck * delta.hue * 60,
      brightness: f.brightness - ck * delta.brightness,
      contrast: f.contrast - ck * delta.contrast,
    });

    const yPlus = loss(target, simulate(fPlus));
    const yMinus = loss(target, simulate(fMinus));

    // gradient estimate
    const g: Filters = {
      invert: (yPlus - yMinus) / (2 * ck * delta.invert),
      sepia: (yPlus - yMinus) / (2 * ck * delta.sepia),
      saturate: (yPlus - yMinus) / (2 * ck * 2 * delta.saturate),
      hue: (yPlus - yMinus) / (2 * ck * 60 * delta.hue),
      brightness: (yPlus - yMinus) / (2 * ck * delta.brightness),
      contrast: (yPlus - yMinus) / (2 * ck * delta.contrast),
    };

    // descend
    f = clampFilters({
      invert: f.invert - ak * g.invert,
      sepia: f.sepia - ak * g.sepia,
      saturate: f.saturate - ak * g.saturate,
      hue: f.hue - ak * g.hue,
      brightness: f.brightness - ak * g.brightness,
      contrast: f.contrast - ak * g.contrast,
    });

    const curLoss = loss(target, simulate(f));
    if (curLoss < bestLoss) {
      bestLoss = curLoss;
      best = { ...f };
    }
  }

  const out = simulate(best).map((v) => Math.round(clamp01(v) * 255)) as [
    number,
    number,
    number
  ];
  const css =
    `invert(${Math.round(best.invert * 100)}%) sepia(${Math.round(
      best.sepia * 100
    )}%) ` +
    `saturate(${Math.round(best.saturate * 100)}%) hue-rotate(${Math.round(
      (best.hue + 360) % 360
    )}deg) ` +
    `brightness(${Math.round(best.brightness * 100)}%) contrast(${Math.round(
      best.contrast * 100
    )}%)`;

  return {
    filters: best,
    outRgb: { r: out[0], g: out[1], b: out[2] },
    css,
    loss: bestLoss,
  };
}

export function cssFilterFromHex(hex: string): string {
  const rgb = hexToRgb(hex);
  const { css } = solveFilters(rgb);
  return css;
}
