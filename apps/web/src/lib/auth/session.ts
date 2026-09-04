import { db } from '@/lib/db';
import type { LoginResponse } from '@/lib/types';

const TOKEN_MARGIN_MS = 30_000;
const ACCESS_TOKEN_TTL_MS = 900_000; // 15 min

export async function saveSession(data: LoginResponse): Promise<void> {
  await db.sesion.put({
    id: 1,
    accessToken: data.accessToken,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
    usuario: data.usuario,
  });
}

export async function getSession() {
  return (await db.sesion.get(1)) ?? null;
}

export async function clearSession(): Promise<void> {
  await db.sesion.delete(1);
}

export async function isTokenValid(): Promise<boolean> {
  const s = await getSession();
  if (!s) return false;
  return s.expiresAt > Date.now() + TOKEN_MARGIN_MS;
}
