export interface NotificationsResp {
  '0(notification)': _0notification;
}

interface _0notification {
  content: string | null;
  id: number;
  published_at: number;
  title: string | null;
}
