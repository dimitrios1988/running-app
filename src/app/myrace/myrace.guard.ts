import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class MyraceGuard implements CanActivate {
  constructor(private router: Router, private authService: AuthService) {}

  canActivate(): boolean | UrlTree {
    if (this.authService.getRunnerUUID() !== '') {
      return true;
    }
    return this.router.createUrlTree(['/tabs/login']);
  }
}
