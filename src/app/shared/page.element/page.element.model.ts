/**
 * Discriminated union of all page element types
 */
export type PageElementModel =
  | TrackingElementModel
  | NewsElementModel
  | InfoParentElementModel
  | CountdownTimerElementModel
  | ContentImageElementModel
  | LinkElementModel
  | SelfieElementModel;

export interface BasePageElement {
  order: number | null;
}

export interface HomeElementModel {
  headerElementModel: HeaderElementModel | null;
  trackingElementModel: TrackingElementModel | null;
  newsElementModel: NewsElementModel | null;
  infoParentElementModel: InfoParentElementModel | null;
  countdownTimerElementModels: CountdownTimerElementModel[] | null;
  contentImageElementModels: ContentImageElementModel[] | null;
  linkElementModels: LinkElementModel[] | null;
  selfieElementModel: SelfieElementModel | null;
}

export interface HeaderElementModel {
  mainImage: string | null;
  mainImagePosition: 'left' | 'right' | 'center' | null;
  mainImageWidth: string | null;
  secondaryImage: string | null;
  secondaryImageWidth: string | null;
  backgroundColor: string | null;
}

export interface TrackingElementModel extends BasePageElement {
  type: 'tracking';
  title: string | null;
  title_size: number | null;
  subtitle: string | null;
  subtitle_size: number | null;
  backgroundColor: string | null;
  textColor: string | null;
  backgroundImage: string | null;
  icon: string | null;
  opens_in_external_url: boolean;
  link: string | null;
  code: string | null;
}

export interface NewsElementModel extends BasePageElement {
  id: number;
  type: 'news';
  title: string | null;
  title_size: number | null;
  subtitle: string | null;
  subtitle_size: number | null;
  backgroundColor: string | null;
  textColor: string | null;
  backgroundImage: string | null;
  icon: string | null;
}

export interface InfoParentElementModel extends BasePageElement {
  type: 'info';
  infoChildElements: InfoChildElementModel[];
}

export interface InfoChildElementModel {
  id: number;
  link: string | null;
  title: string | null;
  title_size: number | null;
  subtitle: string | null;
  subtitle_size: number | null;
  backgroundColor: string | null;
  textColor: string | null;
  opens_in_external_url: boolean;
}

export interface CountdownTimerElementModel extends BasePageElement {
  id: number;
  type: 'countdowntimer';
  targetDateTime: Date;
  backgroundColor: string | null;
  textColor: string | null;
  title: string | null;
  title_size: number | null;
}

export interface ContentImageElementModel extends BasePageElement {
  id: number;
  type: 'contentimage';
  imageUrl: string | null;
  altText: string | null;
  linkUrl: string | null;
}

export interface LinkElementModel extends BasePageElement {
  id: number;
  type: 'link';
  backgroundColor: string | null;
  textColor: string | null;
  title: string | null;
  title_size: number | null;
  url: string | null;
  icon: string | null;
}

export interface SelfieElementModel extends BasePageElement {
  id: number;
  type: 'selfie';
  backgroundColor: string | null;
  textColor: string | null;
  title: string | null;
  title_size: number | null;
  icon: string | null;
  shareText: string | null;
  overlays: SelfieOverlayModel[] | null;
}

/**
 * A frame/sticker the user can composite onto their selfie.
 *
 * Position and size are normalised 0..1 fractions of the captured frame. That is
 * the only representation where the CSS preview (`%` of the stage) and the canvas
 * draw (`x * canvas.width`) are guaranteed to agree - pixel coordinates would need
 * a reference resolution and would drift on every device.
 */
export interface SelfieOverlayModel {
  id: number | string;
  /** Caption under the option square, and its accessible label. */
  name: string | null;
  /** Full-resolution artwork, transparent where the photo should show through. */
  imageUrl: string;
  /** Optional smaller image for the option square; falls back to imageUrl. */
  thumbnailUrl: string | null;
  x: number;
  y: number;
  width: number;
  /** null keeps the artwork's own aspect ratio instead of stretching it. */
  height: number | null;
  /** null renders fully opaque. */
  opacity: number | null;
}
