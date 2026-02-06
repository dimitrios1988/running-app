/**
 * Discriminated union of all page element types
 */
export type PageElementModel =
  | TrackingElementModel
  | NewsElementModel
  | InfoParentElementModel
  | CountdownTimerElementModel
  | ContentImageElementModel;

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
  subtitle: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  backgroundImage: string | null;
  icon: string | null;
  opens_in_external_url: boolean;
  link: string | null;
  code: string | null;
}

export interface NewsElementModel extends BasePageElement {
  type: 'news';
  title: string | null;
  subtitle: string | null;
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
  subtitle: string | null;
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
}

export interface ContentImageElementModel extends BasePageElement {
  id: number;
  type: 'contentimage';
  imageUrl: string | null;
  altText: string | null;
  linkUrl: string | null;
}
