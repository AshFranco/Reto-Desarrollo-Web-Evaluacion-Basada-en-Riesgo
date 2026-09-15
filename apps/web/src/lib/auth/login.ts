import { saveSession } from './session';
import { descargarCatalogo } from '@/lib/catalogo/loader';
import { descargarCatalogoMotor } from '@/lib/catalogo/loaderMotor';
import type { LoginResult } from '@/lib/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Inicia sesión contra el backend y guarda el resultado con saveSession().
 * Usa credentials: 'include' para que la cookie httpOnly del refresh token
 * quede fijada por el servidor, igual que hace silentRefresh() en refresh.ts.
 *
 * Si el backend responde con error (401, 400, etc.) se propaga tal cual —
 * no se oculta ni se reintenta aquí. La pantalla de login es quien decide
 * qué mostrarle al usuario.
 */

/** Mismos roles que @Roles() en motor-riesgo.controller.ts (GET /motor-riesgo/catalogo) — para el resto (Empresa/Usuario delegado) esa llamada siempre da 403. */
const ROLES_CON_ACCESO_AL_MOTOR = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];

export async function login(
  correo: string,
  password: string,
  codigoMfa?: string,
): Promise<LoginResult> {
  const respuesta = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correo,
      password,
      ...(codigoMfa ? { codigoMfa: codigoMfa.trim() } : {}),
    }),
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.message ?? `Error al iniciar sesión (${respuesta.status})`);
  }

  const data: LoginResult = await respuesta.json();
  if (data.requiereMfa) {
    return data;
  }

  await saveSession(data);
  // Descarga el catálogo de formularios para todos los roles (el endpoint
  // no tiene restricción). El catálogo del motor de riesgo solo se
  // descarga para los roles que el backend realmente autoriza a verlo
  // (@Roles en motor-riesgo.controller.ts) -- para Empresa/Usuario
  // delegado, descargarCatalogoMotor() siempre daba 403.
  const descargas = [descargarCatalogo()];
  if (ROLES_CON_ACCESO_AL_MOTOR.includes(data.usuario.rol)) {
    descargas.push(descargarCatalogoMotor());
  }
  await Promise.all(descargas);
  return data;
}
