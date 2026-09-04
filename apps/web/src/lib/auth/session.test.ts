import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { saveSession, getSession, clearSession, isTokenValid } from './session';
import type { LoginResponse } from '@/lib/types';

const LOGIN: LoginResponse = {
  accessToken: 'acc',
  usuario: { id: '1', nombreCompleto: 'Ana', rol: 'TECNICO_EVALUADOR', empresaId: null },
};

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('session', () => {
  it('saveSession guarda el token con expiresAt correcto', async () => {
    const antes = Date.now();
    await saveSession(LOGIN);
    const s = await db.sesion.get(1);
    expect(s?.accessToken).toBe('acc');
    expect(s?.expiresAt).toBeGreaterThanOrEqual(antes + 900_000 - 100);
  });

  it('getSession devuelve null si no hay sesion', async () => {
    expect(await getSession()).toBeNull();
  });

  it('getSession devuelve la sesion guardada', async () => {
    await saveSession(LOGIN);
    const s = await getSession();
    expect(s?.usuario.rol).toBe('TECNICO_EVALUADOR');
  });

  it('clearSession elimina el registro', async () => {
    await saveSession(LOGIN);
    await clearSession();
    expect(await getSession()).toBeNull();
  });

  it('isTokenValid devuelve true si no ha expirado', async () => {
    await saveSession(LOGIN);
    expect(await isTokenValid()).toBe(true);
  });

  it('isTokenValid devuelve false si expiresAt pasó', async () => {
    await db.sesion.put({
      id: 1, accessToken: 'tok', expiresAt: Date.now() - 1000,
      usuario: { id: '1', nombreCompleto: 'Ana', rol: 'TECNICO_EVALUADOR', empresaId: null },
    });
    expect(await isTokenValid()).toBe(false);
  });
});
