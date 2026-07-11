// Lo que envías AL login (usa username, no email)
export interface LoginI {
  username: string;   // ← Django usa username, no email
  password: string;
}

// Lo que Django responde en el BODY: tokens JWT + usuario
export interface LoginResponseI {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    roles?: string[];
  };
}

// Respuesta del refresh de token JWT
export interface RefreshResponseI {
  access: string;
}

// Para el registro
export interface RegisterI {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponseI {
  message: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

// Usuario autenticado (para guardar en el servicio)
export interface UserI {
  id: number;
  username: string;
  email: string;
  roles?: string[];
}