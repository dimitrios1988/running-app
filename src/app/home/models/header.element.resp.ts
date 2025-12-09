export interface HeaderElementResponse {
  '0(page_element)': _0pageelement;
  '1(language)': _1language;
  '2(element_type)': _2elementtype;
}

interface _2elementtype {
  code: string;
  name: string;
}

interface _1language {
  id: number;
  iso_639_1: string;
  iso_639_2: string;
  name: string;
}

interface _0pageelement {
  background_color: null;
  id: number;
  opens_external_url: boolean;
  order: null;
  primary_image?: Primaryimage[];
  primary_image_width?: number;
  secondary_image?: Secondaryimage[];
  secondary_image_width?: number;
  subtitle: null;
  text_color: null;
  timer: null;
  title: null;
  url: null;
}

interface Primaryimage {
  changed: number;
  hash: string;
  id: string;
  name: string;
  size: number;
  version: number;
}

interface Secondaryimage {
  changed: number;
  hash: string;
  id: string;
  name: string;
  size: number;
  version: number;
}
