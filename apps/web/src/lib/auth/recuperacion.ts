const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface RespuestaRecuperacion {
  ok: boolean;
  mensaje: string;
  previewUrl?: string;
}

export interface RespuestaRestablecer {
  ok: boolean;
  mensaje: string;
}

export async function solicitarRecuperacionContrasena(correo: string): Promise<RespuestaRecuperacion> {
  const res = await fetch(`${API_BASE}/api/v1/auth/recuperar-contrasena`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al solicitar el enlace de recuperación.');
  }

  return data as RespuestaRecuperacion;
}

export async function restablecerContrasena(
  token: string,
  contrasenaNueva: string,
  confirmacion: string,
): Promise<RespuestaRestablecer> {
  const res = await fetch(`${API_BASE}/api/v1/auth/restablecer-contrasena`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, contrasenaNueva, confirmacion }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al restablecer la contraseña.');
  }

  return data as RespuestaRestablecer;
}
