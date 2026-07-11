import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sin-conexion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-background text-on-background flex flex-col">
      <!-- Cabecera de marca -->
      <header class="flex justify-between items-center w-full h-16 px-4 bg-surface border-b border-outline-variant">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary">construction</span>
          <h1 class="text-headline-md font-extrabold text-primary">Ferretex Pro</h1>
        </div>
        <span class="text-label-md text-on-surface-variant uppercase tracking-wider">Estado de Sistema</span>
      </header>

      <!-- Banner de alerta -->
      <div class="w-full bg-error-container text-on-error-container py-3 px-4 flex items-center justify-center gap-3">
        <span class="material-symbols-outlined text-[20px]">report_problem</span>
        <p class="text-label-md font-bold">ALERTA: No hay comunicación con el servidor de datos.</p>
      </div>

      <!-- Contenido -->
      <main class="flex-1 w-full flex items-center justify-center p-4">
        <div class="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <!-- Logs de diagnóstico -->
          <div class="md:col-span-4 bg-surface-container-low border border-outline-variant p-5 flex flex-col justify-between rounded-lg">
            <div>
              <h2 class="text-label-md text-outline uppercase mb-4 tracking-widest">Logs de Diagnóstico</h2>
              <div class="space-y-3">
                <div class="flex flex-col gap-1">
                  <span class="text-[12px] text-on-surface-variant">Protocolo:</span>
                  <code class="bg-surface-container-highest px-2 py-1 rounded font-mono text-[13px] text-error">REST_API_UNREACHABLE</code>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-[12px] text-on-surface-variant">Host:</span>
                  <code class="bg-surface-container-highest px-2 py-1 rounded font-mono text-[13px]">localhost:8000</code>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-[12px] text-on-surface-variant">Timestamp:</span>
                  <code class="bg-surface-container-highest px-2 py-1 rounded font-mono text-[13px]">{{ timestamp() }}</code>
                </div>
              </div>
            </div>
            <div class="mt-8 pt-4 border-t border-outline-variant/30 flex items-center gap-2 text-on-surface-variant">
              <span class="material-symbols-outlined text-[18px]">dns</span>
              <span class="text-[13px]">Servicio: API Ferretería</span>
            </div>
          </div>

          <!-- Mensaje central -->
          <div class="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-lg p-10 flex flex-col items-center text-center justify-center relative overflow-hidden">
            <div class="absolute inset-0 opacity-[0.03] pointer-events-none"
                 style="background-image: radial-gradient(#00236f 1px, transparent 1px); background-size: 20px 20px;"></div>
            <div class="relative z-10">
              <div class="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-error-container/30 text-error">
                <span class="material-symbols-outlined text-[48px]">cloud_off</span>
              </div>
              <h3 class="text-headline-md font-bold text-on-surface mb-2">Error de conexión detectado</h3>
              <p class="text-body-md text-on-surface-variant max-w-md mx-auto mb-10">
                No pudimos comunicarnos con el servidor central de inventario. Puede deberse a una
                caída temporal de la red o a un mantenimiento del sistema.
              </p>

              @if (retryFailed()) {
                <p class="text-error text-sm font-bold mb-4">El servidor sigue sin responder. Intenta de nuevo en unos momentos.</p>
              }

              <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button type="button" (click)="reintentar()" [disabled]="retrying()"
                  class="min-h-12 min-w-[200px] bg-primary text-on-primary font-bold px-8 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-[0.98] shadow-sm disabled:opacity-60">
                  @if (retrying()) {
                    <span class="material-symbols-outlined animate-spin">progress_activity</span>Reconectando...
                  } @else {
                    <span class="material-symbols-outlined">refresh</span>Reintentar Conexión
                  }
                </button>
                <a href="mailto:soporte@ferretexpro.com"
                  class="min-h-12 min-w-[200px] border border-outline text-on-surface-variant font-bold px-8 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container transition-all active:scale-[0.98]">
                  <span class="material-symbols-outlined">support_agent</span>Contactar Soporte
                </a>
              </div>
            </div>
          </div>

          <!-- Info contextual -->
          <div class="md:col-span-12 flex flex-col md:flex-row gap-6">
            <div class="flex-1 bg-surface border border-outline-variant rounded-lg p-5 flex items-center gap-4">
              <div class="p-3 bg-secondary-container/10 rounded-full text-secondary"><span class="material-symbols-outlined">info</span></div>
              <div>
                <h4 class="text-label-md font-bold text-on-surface">Verifica el backend</h4>
                <p class="text-[13px] text-on-surface-variant">Asegúrate de que el servidor Django esté corriendo en el puerto 8000.</p>
              </div>
            </div>
            <div class="flex-1 bg-surface border border-outline-variant rounded-lg p-5 flex items-center gap-4">
              <div class="p-3 bg-tertiary-container/10 rounded-full text-tertiary"><span class="material-symbols-outlined">login</span></div>
              <div>
                <h4 class="text-label-md font-bold text-on-surface">Sesión</h4>
                <p class="text-[13px] text-on-surface-variant">Si el problema persiste, cierra sesión y vuelve a iniciar.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class SinConexion {
  private http = inject(HttpClient);
  private router = inject(Router);

  timestamp = signal(this.now());
  retrying = signal(false);
  retryFailed = signal(false);

  private now(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  reintentar(): void {
    this.retrying.set(true);
    this.retryFailed.set(false);
    // El backend expone /health/ para chequeo de disponibilidad.
    this.http.get('http://localhost:8000/health/').subscribe({
      next: () => {
        this.retrying.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.retrying.set(false);
        this.retryFailed.set(true);
        this.timestamp.set(this.now());
      },
    });
  }
}
