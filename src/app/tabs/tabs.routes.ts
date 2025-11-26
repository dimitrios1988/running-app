import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

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
            (m) => m.InfoViewerComponent
          ),
      },
      {
        path: 'home/news',
        loadComponent: () =>
          import('../home/news/news-list/news.list.component').then(
            (m) => m.NewsListComponent
          ),
      },
      {
        path: 'home/news/viewer/:id',
        loadComponent: () =>
          import('../home/news/news-viewer/news.viewer.component').then(
            (m) => m.NewsViewerComponent
          ),
      },
      {
        path: 'home/settings',
        loadComponent: () =>
          import('../settings/settings.component').then(
            (m) => m.SettingsComponent
          ),
      },
      {
        path: 'tab2',
        loadComponent: () =>
          import('../tab2/tab2.page').then((m) => m.Tab2Page),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('../notifications/notifications.page').then(
            (m) => m.NotificationsPage
          ),
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
