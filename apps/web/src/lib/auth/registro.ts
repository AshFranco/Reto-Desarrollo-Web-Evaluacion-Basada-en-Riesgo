const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Campos confirmados contra RegistroUsuarioDto (apps/api/src/modules/auth/dto/registro-usuario.dto.ts),
 * ya actualizado en develop (commit 127e096): nombreCompleto, cedulaPasaporte,
 * correo, telefono (opcional), password, rol, empresaId, y ahora también
 * cartaAutorizacionUrl (opcional). Sigue sin ser un campo de archivo real —
 * es un string de hasta 500 caracteres (una URL ya subida a otro lugar), no
 * multipart/FileInterceptor. No existe todavía un endpoint que reciba el
 * archivo y devuelva esa URL, así que por ahora el campo espera que el
 * usuario ya tenga el enlace (ej. de un documento compartido).
 *
 * `rol` está restringido al enum RolRegistrable del propio DTO: el backend
 * rechaza cualquier otro valor (y el estado inicial PENDIENTE_VALIDACION lo
 * fija el servidor, nunca el cliente).
 */
export type RolRegistrable = 'ADMINISTRADOR_EMPRESA' | 'USUARIO_DELEGADO';

export interface DatosRegistro {
  nombreCompleto: string;
  cedulaPasaporte: string;
  correo: string;
  telefono?: string;
  password: string;
  rol: RolRegistrable;
  empresaId: string;
  cartaAutorizacionUrl?: string;
}

export interface RegistroResponse {
  mensaje: string;
  usuario: {
    id: string;
    correoElectronico: string;
    nombreCompleto: string;
  };
}

/**
 * POST /api/v1/auth/registro — ruta @Public(), no requiere sesión.
 * Mismo criterio honesto que login.ts: el error del backend se propaga tal
 * cual (incluye los mensajes de class-validator cuando la respuesta es 400),
 * sin suavizarlo ni reintentar acá. No guarda sesión ni intenta loguear:
 * el usuario queda PENDIENTE_VALIDACION y no puede iniciar sesión todavía.
 */
export async function registro(datos: DatosRegistro): Promise<RegistroResponse> {
  const respuesta = await fetch(`${API_BASE}/api/v1/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message.join(' ') : cuerpo?.message;
    throw new Error(mensaje ?? `Error al registrarse (${respuesta.status})`);
  }

  return respuesta.json();
}
