import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { login } from './login';
import { getSession } from './session';

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('login', () => {
  it('con credenciales válidas guarda la sesión y devuelve los datos del usuario', async () => {
    const data = await login('tecnico@ebr.local', 'clave-de-prueba', 'DEV_CAPTCHA_BYPASS');

    expect(data.accessToken).toBeTruthy();
    expect(data.usuario.rol).toBe('TECNICO_EVALUADOR');

    const sesion = await getSession();
    expect(sesion?.accessToken).toBe(data.accessToken);
    expect(sesion?.usuario.nombreCompleto).toBe(data.usuario.nombreCompleto);
  });

  it('propaga el error tal cual cuando el backend responde 401 (ej. captcha) y no guarda sesión', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json({ message: 'Verificación anti-bot fallida.' }, { status: 401 })
      )
    );

    await expect(login('admin@ebr.local', 'cualquiera', 'DEV_CAPTCHA_BYPASS')).rejects.toThrow('Verificación anti-bot fallida.');

    const sesion = await getSession();
    expect(sesion).toBeNull();
  });

  it('si el backend no manda un mensaje, arma uno propio con el código de estado', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () => new HttpResponse(null, { status: 500 }))
    );

    await expect(login('admin@ebr.local', 'cualquiera', 'DEV_CAPTCHA_BYPASS')).rejects.toThrow('Error al iniciar sesión (500)');
  });

  it('descarga el catálogo en Dexie tras login exitoso (necesario para trabajar offline)', async () => {
    await login('tecnico@ebr.local', 'clave-de-prueba', 'DEV_CAPTCHA_BYPASS');

    const meta = await db.catalogo_meta.get(1);
    expect(meta).toBeTruthy();
    expect(meta?.versionFichaId).toBeTruthy();
    expect(meta?.opcionesRespuesta.length).toBeGreaterThan(0);

    const items = await db.catalogo_item.count();
    expect(items).toBeGreaterThan(0);
  });

  it('manda correo, password y captchaToken en el cuerpo de la petición (lo que el backend real exige)', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({
          accessToken: 'token',
          usuario: { id: '1', nombreCompleto: 'X', rol: 'TECNICO_EVALUADOR', empresaId: null },
        });
      })
    );

    await login('tecnico@ebr.local', 'clave-de-prueba', 'DEV_CAPTCHA_BYPASS');

    expect(cuerpoRecibido).toEqual({
      correo: 'tecnico@ebr.local',
      password: 'clave-de-prueba',
      captchaToken: 'DEV_CAPTCHA_BYPASS',
    });
  });
});
