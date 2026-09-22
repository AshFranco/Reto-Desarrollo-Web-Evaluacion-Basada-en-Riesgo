import { getSession, saveSession } from './session';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function silentRefresh(): Promise<boolean> {
  const sesion = await getSession();
  if (!sesion) return false;

  let timerId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => reject(new Error('Timeout en silentRefresh')), 8_000);
  });

  try {
    const fetchPromise = fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    const res = await Promise.race([fetchPromise, timeoutPromise]);
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string };
    await saveSession({ accessToken: data.accessToken, usuario: sesion.usuario });
    return true;
  } catch {
    return false;
  } finally {
    if (timerId !== undefined) clearTimeout(timerId);
  }
}
