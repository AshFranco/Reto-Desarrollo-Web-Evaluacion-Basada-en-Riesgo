import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { saveSession, getSession } from './session';
import { silentRefresh } from './refresh';
import { MOCK_LOGIN_RESPONSE, MOCK_ACCESS_TOKEN } from '@/mocks/handlers';

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('silentRefresh', () => {
  it('devuelve false si no hay sesion guardada', async () => {
    expect(await silentRefresh()).toBe(false);
  });

  it('llama a /api/v1/auth/refresh sin body y actualiza el token', async () => {
    await saveSession(MOCK_LOGIN_RESPONSE);
    const resultado = await silentRefresh();
    expect(resultado).toBe(true);
    const s = await getSession();
    expect(s?.accessToken).toBe(MOCK_ACCESS_TOKEN);
  });

  it('devuelve false si el servidor responde 401', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/refresh', () =>
        HttpResponse.json({ message: 'Sesión inválida.' }, { status: 401 })
      )
    );
    await saveSession(MOCK_LOGIN_RESPONSE);
    expect(await silentRefresh()).toBe(false);
  });
});
