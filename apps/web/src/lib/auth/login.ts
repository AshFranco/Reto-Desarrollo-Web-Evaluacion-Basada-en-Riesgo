import { saveSession } from './session';
import { descargarCatalogo } from '@/lib/catalogo/loader';
import { descargarCatalogoMotor } from '@/lib/catalogo/loaderMotor';
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
 * Ya no manda captchaToken: el backend le quitó ese campo a LoginDto
 * ("fix: elimina el captcha del login, no era requisito del SRS") y
 * ahora rechaza con 400 cualquier campo que no esté declarado en el DTO
 * (`ValidationPipe({ forbidNonWhitelisted: true })`) — mandarlo de más
 * rompería el login en vez de arreglarlo.
 */
export async function login(correo: string, password: string): Promise<LoginResponse> {
  const respuesta = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, password }),
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.message ?? `Error al iniciar sesión (${respuesta.status})`);
  }

  const data: LoginResponse = await respuesta.json();
  await saveSession(data);
  // Descarga el catálogo de formularios y el catálogo del motor de riesgo
  // en paralelo para que el técnico pueda trabajar offline desde el primer día.
  await Promise.all([descargarCatalogo(), descargarCatalogoMotor()]);
  return data;
}
