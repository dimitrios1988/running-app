export interface InfoViewerResponse {
  '0(page_element)': _0pageelement;
}
interface _0pageelement {
  primary_image: Primaryimage[] | null;
  title: null | string;
  url: string | null;
  content: null | string;
}

interface Primaryimage {
  changed: number;
  hash: string;
  id: string;
  name: string;
  size: number;
  version: number;
}
