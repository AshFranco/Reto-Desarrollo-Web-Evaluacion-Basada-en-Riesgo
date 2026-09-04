import { getSession, saveSession } from './session';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function silentRefresh(): Promise<boolean> {
  const sesion = await getSession();
  if (!sesion) return false;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json() as { accessToken: string };
    await saveSession({ accessToken: data.accessToken, usuario: sesion.usuario });
    return true;
  } catch {
    return false;
  }
}
