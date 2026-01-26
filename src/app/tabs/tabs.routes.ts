import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';
import { MyraceGuard } from '../myrace/myrace.guard';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('../home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'home/info/viewer/:id',
        loadComponent: () =>
          import('../home/info/info.viewer/info.viewer.component').then(
            (m) => m.InfoViewerComponent,
          ),
      },
      {
        path: 'home/news',
        loadComponent: () =>
          import('../home/news/news-list/news.list.component').then(
            (m) => m.NewsListComponent,
          ),
      },
      {
        path: 'home/news/viewer/:id',
        loadComponent: () =>
          import('../home/news/news-viewer/news.viewer.component').then(
            (m) => m.NewsViewerComponent,
          ),
      },
      {
        path: 'home/settings',
        loadComponent: () =>
          import('../settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },
      {
        path: 'home/tracking/viewer',
        loadComponent: () =>
          import('../home/tracking/tracking-viewer/tracking-viewer.component').then(
            (m) => m.TrackingViewerComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('../notifications/notifications.page').then(
            (m) => m.NotificationsPage,
          ),
      },
      {
        path: 'notifications/viewer/:id',
        loadComponent: () =>
          import('../notifications/notifications-viewer/notifications-viewer.component').then(
            (m) => m.NotificationsViewerComponent,
          ),
      },
      {
        path: 'myrace',
        loadComponent: () =>
          import('../myrace/myrace.page').then((m) => m.MyracePage),
        canActivate: [MyraceGuard],
      },
      {
        path: 'login',
        loadComponent: () =>
          import('../auth/login/login.page').then((m) => m.LoginPage),
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];
