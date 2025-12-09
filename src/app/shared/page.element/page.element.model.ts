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
  order: number;
}

export interface TrackingElementModel extends BasePageElement {
  type: 'tracking';
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
  backgroundImage: string;
  icon: string;
}

export interface NewsElementModel extends BasePageElement {
  type: 'news';
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
  backgroundImage: string;
  icon: string;
}

export interface InfoParentElementModel extends BasePageElement {
  type: 'info';
  infoChildElements: InfoChildElementModel[];
}

export interface InfoChildElementModel {
  id: number;
  link: string | null;
  title: string | null;
  subtitle: string;
  backgroundColor: string | null;
  textColor: string;
  opens_in_external_url: boolean;
}

export interface CountdownTimerElementModel extends BasePageElement {
  id: number;
  type: 'countdowntimer';
  targetDateTime: Date;
  backgroundColor: string | null;
  textColor: string | null;
  title: string;
}

export interface ContentImageElementModel extends BasePageElement {
  id: number;
  type: 'contentimage';
  imageUrl: string;
  altText: string;
  linkUrl: string | null;
}
