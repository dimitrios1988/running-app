type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function clamp(value: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, value));
}

class Color {
  r: number;
  g: number;
  b: number;

  constructor(r: number, g: number, b: number) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  invert(value: number) {
    this.r = clamp((value + (this.r / 255) * (1 - 2 * value)) * 255);
    this.g = clamp((value + (this.g / 255) * (1 - 2 * value)) * 255);
    this.b = clamp((value + (this.b / 255) * (1 - 2 * value)) * 255);
  }

  sepia(value: number) {
    const r = this.r,
      g = this.g,
      b = this.b;
    this.r = clamp(
      r * (1 - 0.607 * value) + g * (0.769 * value) + b * (0.189 * value),
    );
    this.g = clamp(
      r * (0.349 * value) + g * (1 - 0.314 * value) + b * (0.168 * value),
    );
    this.b = clamp(
      r * (0.272 * value) + g * (0.534 * value) + b * (1 - 0.869 * value),
    );
  }

  saturate(value: number) {
    const r = this.r,
      g = this.g,
      b = this.b;
    this.r = clamp(
      (0.213 + 0.787 * value) * r +
        (0.715 - 0.715 * value) * g +
        (0.072 - 0.072 * value) * b,
    );
    this.g = clamp(
      (0.213 - 0.213 * value) * r +
        (0.715 + 0.285 * value) * g +
        (0.072 - 0.072 * value) * b,
    );
    this.b = clamp(
      (0.213 - 0.213 * value) * r +
        (0.715 - 0.715 * value) * g +
        (0.072 + 0.928 * value) * b,
    );
  }

  hueRotate(angle: number) {
    const rad = (angle / 180) * Math.PI;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const r = this.r,
      g = this.g,
      b = this.b;

    this.r = clamp(
      (0.213 + cos * 0.787 - sin * 0.213) * r +
        (0.715 - cos * 0.715 - sin * 0.715) * g +
        (0.072 - cos * 0.072 + sin * 0.928) * b,
    );

    this.g = clamp(
      (0.213 - cos * 0.213 + sin * 0.143) * r +
        (0.715 + cos * 0.285 + sin * 0.14) * g +
        (0.072 - cos * 0.072 - sin * 0.283) * b,
    );

    this.b = clamp(
      (0.213 - cos * 0.213 - sin * 0.787) * r +
        (0.715 - cos * 0.715 + sin * 0.715) * g +
        (0.072 + cos * 0.928 + sin * 0.072) * b,
    );
  }

  brightness(value: number) {
    this.r = clamp(this.r * value);
    this.g = clamp(this.g * value);
    this.b = clamp(this.b * value);
  }

  contrast(value: number) {
    this.r = clamp((this.r - 128) * value + 128);
    this.g = clamp((this.g - 128) * value + 128);
    this.b = clamp((this.b - 128) * value + 128);
  }
}

function colorDistance(c1: RGB, c2: RGB): number {
  return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
}

export function hexToCssFilter(hex: string): string {
  const target = hexToRgb(hex);

  let best = {
    loss: Infinity,
    filter: '',
  };

  // brute-force-ish random search
  for (let i = 0; i < 1000; i++) {
    const params = {
      invert: Math.random(),
      sepia: Math.random(),
      saturate: Math.random() * 5,
      hue: Math.random() * 360,
      brightness: 0.5 + Math.random(),
      contrast: 0.5 + Math.random(),
    };

    const color = new Color(0, 0, 0);

    color.invert(params.invert);
    color.sepia(params.sepia);
    color.saturate(params.saturate);
    color.hueRotate(params.hue);
    color.brightness(params.brightness);
    color.contrast(params.contrast);

    const loss = colorDistance(color, target);

    if (loss < best.loss) {
      best.loss = loss;
      best.filter =
        `invert(${Math.round(params.invert * 100)}%) ` +
        `sepia(${Math.round(params.sepia * 100)}%) ` +
        `saturate(${Math.round(params.saturate * 100)}%) ` +
        `hue-rotate(${Math.round(params.hue)}deg) ` +
        `brightness(${Math.round(params.brightness * 100)}%) ` +
        `contrast(${Math.round(params.contrast * 100)}%)`;
    }
  }

  return best.filter;
}
