export interface HomeElementResponse {
  '0(page_element)': _0pageelement;
  '1(language)': _1language;
  '2(element_type)': _2elementtype;
  '3(image_position)': _3imageposition;
}

interface _3imageposition {
  code: null | 'left' | 'right' | 'center';
}

interface _2elementtype {
  code: string;
}

interface _1language {
  id: number;
  iso_639_1: string;
  iso_639_2: string;
  name: string;
}

interface _0pageelement {
  background_color: null | string;
  id: number;
  opens_external_url: boolean | null;
  order: null | number;
  primary_image: Image[] | null;
  primary_image_width: null | number;
  secondary_image: Image[] | null;
  secondary_image_width: null | number;
  subtitle: null | string;
  subtitle_size: null | number;
  text_color: null | string;
  timer: number | null;
  title: null | string;
  title_size: null | number;
  url: string | null;
  code: string | null;
}

interface Image {
  changed: number;
  hash: string;
  id: string;
  name: string;
  size: number;
  version: number;
}
