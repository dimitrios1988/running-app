export interface INewsListItem {
  id: number;
  title: string;
  excerpt: string | null;
  publishedDate: Date;
  featuredImageUrl: string | null;
}
