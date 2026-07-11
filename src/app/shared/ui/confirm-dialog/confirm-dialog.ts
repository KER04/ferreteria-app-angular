import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../../core/services/confirm.service';

// Modal de confirmación global. Se monta una sola vez en la raíz de la app
// y se controla mediante ConfirmService.
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (svc.state(); as s) {
      @if (s.open) {
        <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150"
             (click)="svc.cancel()">
          <div class="bg-surface-container-lowest w-full max-w-md rounded-xl border border-outline-variant shadow-2xl p-6"
               (click)="$event.stopPropagation()">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                   [ngClass]="s.tone === 'primary' ? 'bg-primary/10' : 'bg-error-container/60'">
                <span class="material-symbols-outlined text-2xl" [ngClass]="s.tone === 'primary' ? 'text-primary' : 'text-error'">
                  {{ s.icon || (s.tone === 'primary' ? 'help' : 'warning') }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-on-surface">{{ s.title || 'Confirmar acción' }}</h3>
                <p class="text-sm text-on-surface-variant mt-1">{{ s.message }}</p>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 mt-6">
              <button type="button" (click)="svc.cancel()"
                class="px-5 h-10 rounded-lg border border-outline-variant text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-colors">
                {{ s.cancelText || 'Cancelar' }}
              </button>
              <button type="button" (click)="svc.accept()"
                class="px-6 h-10 rounded-lg text-on-primary font-bold text-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                [ngClass]="s.tone === 'primary' ? 'bg-primary' : 'bg-error'">
                {{ s.confirmText || 'Aceptar' }}
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class ConfirmDialog {
  svc = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.svc.state().open) this.svc.cancel();
  }
}
