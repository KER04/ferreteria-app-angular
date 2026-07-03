import { HttpErrorResponse } from '@angular/common/http';

// Los endpoints de administración exigen IsAdminRole en el backend,
// incluso para LEER. Mapeamos 401/403 a un aviso claro y el resto
// a mensajes útiles (DRF devuelve {detail} o {campo: [errores]}).
export function adminErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401 || err.status === 403) {
      return 'Requiere rol administrador. Tu sesión no tiene permisos para esta operación.';
    }
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor (http://localhost:8000).';
    }
    const body = err.error;
    if (body && typeof body === 'object') {
      if (typeof body.detail === 'string') return body.detail;
      // Errores de validación DRF: {campo: ["mensaje", ...]}
      const parts: string[] = [];
      for (const [campo, val] of Object.entries(body as Record<string, unknown>)) {
        const msgs = Array.isArray(val) ? val.join(' ') : String(val);
        parts.push(campo === 'non_field_errors' ? msgs : `${campo}: ${msgs}`);
      }
      if (parts.length) return parts.join(' · ');
    }
  }
  return fallback;
}

export function isAdminForbidden(err: unknown): boolean {
  return err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403);
}
