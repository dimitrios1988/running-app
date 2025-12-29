export interface INotification {
  id: number;
  publishedAt: Date;
  title: string | null;
  message: string | null;
  isRead: boolean;
}
