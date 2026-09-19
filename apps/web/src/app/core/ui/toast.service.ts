import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const TOAST_DURATION_MS = 6000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsState = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = this.toastsState.asReadonly();

  show(message: string, type: ToastType = 'success'): void {
    const toast: Toast = { id: this.nextId++, message, type };

    this.toastsState.update((current) => [...current, toast]);

    setTimeout(() => this.dismiss(toast.id), TOAST_DURATION_MS);
  }

  dismiss(id: number): void {
    this.toastsState.update((current) => current.filter((toast) => toast.id !== id));
  }
}