import { saveSession } from './session';
import { descargarCatalogo } from '@/lib/catalogo/loader';
import type { LoginResponse } from '@/lib/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Inicia sesión contra el backend y guarda el resultado con saveSession().
 * Usa credentials: 'include' para que la cookie httpOnly del refresh token
 * quede fijada por el servidor, igual que hace silentRefresh() en refresh.ts.
 *
 * Si el backend responde con error (401, 400, etc.) se propaga tal cual —
 * no se oculta ni se reintenta aquí. La pantalla de login es quien decide
 * qué mostrarle al usuario.
 *
 * captchaToken es obligatorio porque LoginDto (backend) lo exige con
 * @IsNotEmpty() — sin él, el backend real rechaza la petición con 400
 * antes de siquiera revisar la contraseña.
 */
export async function login(correo: string, password: string, captchaToken: string): Promise<LoginResponse> {
  const respuesta = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, password, captchaToken }),
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.message ?? `Error al iniciar sesión (${respuesta.status})`);
  }

  const data: LoginResponse = await respuesta.json();
  await saveSession(data);
  // Descarga el catálogo de formularios inmediatamente post-login para que
  // el técnico pueda trabajar offline desde la primera inspección del día.
  await descargarCatalogo();
  return data;
}
