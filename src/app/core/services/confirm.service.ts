import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
  icon?: string;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

// Servicio global para pedir confirmación con un modal propio del sistema
// (reemplaza al confirm() nativo del navegador).
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private resolver: ((value: boolean) => void) | null = null;
  readonly state = signal<ConfirmState>({ open: false, message: '' });

  ask(options: ConfirmOptions): Promise<boolean> {
    this.state.set({ open: true, ...options });
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  accept(): void {
    this.close(true);
  }

  cancel(): void {
    this.close(false);
  }

  private close(result: boolean): void {
    this.state.update((s) => ({ ...s, open: false }));
    const resolve = this.resolver;
    this.resolver = null;
    resolve?.(result);
  }
}
