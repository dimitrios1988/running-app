import { qrSvgDataUrl } from './qr-svg';

const PREFIX = 'data:image/svg+xml;base64,';

describe('qrSvgDataUrl', () => {
  it('draws an SVG that scales to its box', () => {
    const url = qrSvgDataUrl('RUNNER-1234') ?? '';

    expect(url.startsWith(PREFIX)).toBeTrue();
    const svg = atob(url.slice(PREFIX.length));
    expect(svg).toMatch(/^<svg[^>]* viewBox="0 0 \d+ \d+"/);
    // No fixed size on the root, or it would not fill .bib-qr-slot.
    expect(svg).not.toMatch(/^<svg[^>]* (width|height)=/);
  });

  it('gives the same string for the same payload, so [src] stays stable', () => {
    expect(qrSvgDataUrl('RUNNER-1234')).toBe(qrSvgDataUrl('RUNNER-1234'));
  });

  it('draws a different code for a different payload', () => {
    expect(qrSvgDataUrl('RUNNER-1234')).not.toBe(qrSvgDataUrl('RUNNER-1235'));
  });

  it('returns null for a payload too long for any QR code', () => {
    // The largest QR code (version 40) holds 1,273 bytes at ECC H.
    expect(qrSvgDataUrl('x'.repeat(2000))).toBeNull();
  });
});
