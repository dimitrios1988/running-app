import { renderSVG } from 'uqr';

/**
 * The runner's QR code as an SVG data URL, drawn on the device so it shows at
 * bib pickup with no signal, and the payload never leaves the phone.
 *
 * ECC H and a 4-module quiet zone match what api.qrserver.com used to be asked
 * for (`ecc=H&qzone=4`). The SVG has a viewBox and no size, so it scales to its
 * CSS box. The same payload always yields the same string, which keeps the
 * page's `[src]` binding stable.
 *
 * Returns null when the payload cannot be encoded - uqr throws a RangeError
 * when it is too long for any QR version - and the page shows its error face.
 */
export function qrSvgDataUrl(data: string): string | null {
  try {
    const svg = renderSVG(data, { ecc: 'H', border: 4 });
    // The markup is plain ASCII (numbers, path commands, colour names), so
    // btoa needs no UTF-8 step.
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  } catch {
    return null;
  }
}
