import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  public form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    bib: ['', [Validators.required]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toastController: ToastService,
    private translateService: TranslateService,
  ) {}

  onSubmit() {
    if (this.form.invalid) return;
    const { email, bib } = this.form.value as { email: string; bib: string };
    this.auth.loginRunner(bib, email).subscribe({
      next: () => {
        if (this.auth.getRunnerUUID() !== '')
          this.router.navigateByUrl('/tabs/myrace', { replaceUrl: true });
      },
      error: () => {
        const message = this.translateService.instant(
          'AUTH.ERRORS.INVALID_CREDENTIALS',
        );
        this.toastController.showError(message);
      },
    });
  }
}
