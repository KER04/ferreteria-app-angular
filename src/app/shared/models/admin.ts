// Modelos del módulo ADMINISTRACIÓN (apps/autenticacion del backend).
// Nombres de campos derivados EXACTAMENTE de los serializers DRF:
// UsuarioSerializer, RolSerializer, RecursoSerializer, RecursoRolSerializer, UsuarioRolSerializer.

import { Paginated } from './producto';
export type { Paginated };

// Rol embebido en UsuarioSerializer.get_roles → [{id, nombre}]
export interface RolSimple {
  id: number;
  nombre: string;
}

// UsuarioSerializer: ['id','username','first_name','last_name','promedio','disponibilidad','roles']
export interface Usuario {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  promedio: number | null;
  disponibilidad: boolean;
  roles: RolSimple[];
}

// Payload para PATCH/PUT /usuarios/{id}/ (roles es read-only en el serializer)
export interface UsuarioUpdate {
  username?: string;
  first_name?: string;
  last_name?: string;
  promedio?: number | null;
  disponibilidad?: boolean;
}

// RolSerializer: ['id','nombre','descripcion']
export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface RolPayload {
  nombre: string;
  descripcion?: string | null;
}

// RecursoSerializer: ['id','nombre','url']
export interface Recurso {
  id: number;
  nombre: string;
  url: string;
}

export interface RecursoPayload {
  nombre: string;
  url: string;
}

// UsuarioRolSerializer: ['id','usuario','rol','asignado_en'] (usuario y rol son PKs)
export interface UsuarioRol {
  id: number;
  usuario: number;
  rol: number;
  asignado_en: string;
}

export interface UsuarioRolPayload {
  usuario: number;
  rol: number;
}

// RecursoRolSerializer: ['id','rol','recurso','asignado_en'] (rol y recurso son PKs)
export interface RecursoRol {
  id: number;
  rol: number;
  recurso: number;
  asignado_en: string;
}

export interface RecursoRolPayload {
  rol: number;
  recurso: number;
}
