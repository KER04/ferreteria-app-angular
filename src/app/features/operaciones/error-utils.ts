import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Convierte errores de DRF (400 con dict de campos, 403, detail, etc.)
 * en un mensaje legible para el usuario.
 */
export function extraerMensajeError(err: unknown, fallback: string): string {
  const httpErr = err as HttpErrorResponse;

  if (httpErr?.status === 403) {
    return 'No tienes permisos para realizar esta acción (se requiere rol administrador).';
  }
  if (httpErr?.status === 401) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  }
  if (httpErr?.status === 0) {
    return `No se pudo conectar con el servidor (${environment.host}).`;
  }

  const body = httpErr?.error;
  if (!body || typeof body === 'string') return fallback;

  if (typeof body.detail === 'string') return body.detail;

  // Dict de errores por campo: {"campo": ["msg"], "non_field_errors": [...], "detalles": [...]}
  if (typeof body === 'object') {
    const partes: string[] = [];
    for (const [campo, valor] of Object.entries(body as Record<string, unknown>)) {
      const texto = aplanar(valor);
      if (!texto) continue;
      partes.push(campo === 'non_field_errors' ? texto : `${campo}: ${texto}`);
    }
    if (partes.length) return partes.join(' — ');
  }

  return fallback;
}

function aplanar(valor: unknown): string {
  if (valor == null) return '';
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) return valor.map(aplanar).filter(Boolean).join(' ');
  if (typeof valor === 'object') {
    return Object.entries(valor as Record<string, unknown>)
      .map(([k, v]) => {
        const t = aplanar(v);
        return t ? (k === 'non_field_errors' ? t : `${k}: ${t}`) : '';
      })
      .filter(Boolean)
      .join(' ');
  }
  return String(valor);
}
