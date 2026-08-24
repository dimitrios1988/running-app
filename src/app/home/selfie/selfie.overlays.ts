import { SelfieOverlayModel } from '../../shared/page.element/page.element.model';

/**
 * Sample overlays used while `SelfieElementModel.overlays` is still null, so the
 * camera is usable before the CMS data is wired up.
 *
 * Authoring contract: x/y/width/height are fractions of the captured frame, and
 * the frame is 3:4 (portrait). Artwork meant to cover the whole frame should be
 * authored at 3:4 too - a 16:9 asset stretched to `width: 1, height: 1` will look
 * squashed. Leave `height` null to keep the artwork's own aspect ratio.
 *
 * Paths are relative (`assets/...`, not `/assets/...`) so they resolve under
 * `capacitor://localhost` on device as well as in the browser.
 */
export const DEFAULT_SELFIE_OVERLAYS: SelfieOverlayModel[] = [
  {
    id: 'race-frame',
    name: 'Race frame',
    imageUrl: 'assets/overlays/race-frame.svg',
    thumbnailUrl: null,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    opacity: null,
  },
  {
    id: 'finisher-banner',
    name: 'Finisher',
    imageUrl: 'assets/overlays/finisher-banner.svg',
    thumbnailUrl: null,
    x: 0.1,
    y: 0.06,
    width: 0.8,
    height: null,
    opacity: null,
  },
  {
    id: 'bib-badge',
    name: 'Race bib',
    imageUrl: 'assets/overlays/bib-badge.svg',
    thumbnailUrl: null,
    x: 0.06,
    y: 0.7,
    width: 0.34,
    height: null,
    opacity: null,
  },
];
