import { Routes } from '@angular/router';
import { featureFlagGuard } from './client/feature-flag.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.page').then((m) => m.LoginPage),
    canActivate: [featureFlagGuard('myRace')],
  },
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
];
