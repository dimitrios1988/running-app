export interface NewsItemResponse {
  '0(post)': _0post;
}

interface _0post {
  content: string | null;
  header_image: HeaderImage[] | null;
  id: number;
  title: string;
  published_at: number;
}
interface HeaderImage {
  changed: number;
  hash: string;
  id: string;
  name: string;
  size: number;
  version: number;
}
