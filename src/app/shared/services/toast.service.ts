import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

export interface ToastOptions {
  duration?: number;
  position?: 'top' | 'middle' | 'bottom';
  cssClass?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastController = inject(ToastController);

  async showError(message: string, options?: ToastOptions): Promise<void> {
    await this.show(message, 'danger', options);
  }

  async showSuccess(message: string, options?: ToastOptions): Promise<void> {
    await this.show(message, 'success', options);
  }

  async showWarning(message: string, options?: ToastOptions): Promise<void> {
    await this.show(message, 'warning', options);
  }

  async showInfo(message: string, options?: ToastOptions): Promise<void> {
    await this.show(message, 'primary', options);
  }

  private async show(
    message: string,
    color: string,
    options?: ToastOptions
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: options?.duration ?? 3000,
      position: options?.position ?? 'bottom',
      cssClass: options?.cssClass,
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel',
        },
      ],
    });

    await toast.present();
  }
}
