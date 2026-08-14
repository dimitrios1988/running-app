import { Component } from '@angular/core';

import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { ribbonOutline } from 'ionicons/icons';

function wholeNumber(
  control: AbstractControl<number | null>,
): ValidationErrors | null {
  const value = control.value;
  return value === null || Number.isInteger(value)
    ? null
    : { wholeNumber: true };
}

@Component({
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  public form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    bib: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      wholeNumber,
    ]),
  });

  get bibErrorKey(): string {
    const errors = this.form.controls.bib.errors;
    if (!errors) return '';
    return errors['required']
      ? 'AUTH.ERRORS.BIB_REQUIRED'
      : 'AUTH.ERRORS.BIB_INVALID';
  }

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toastController: ToastService,
    private translateService: TranslateService,
  ) {
    addIcons({ ribbonOutline });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const { email, bib } = this.form.getRawValue();
    if (email === null || bib === null) return;
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
