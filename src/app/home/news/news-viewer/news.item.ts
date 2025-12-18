export interface INews {
  id: number;
  title: string;
  content: string | null;
  publishedDate: Date;
  featuredImageUrl: string | null;
}
