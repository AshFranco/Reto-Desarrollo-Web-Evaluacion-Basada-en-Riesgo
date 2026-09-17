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
    const data = await login('tecnico@ebr.local', 'clave-de-prueba');

    expect(data.requiereMfa).toBeFalsy();
    if (!data.requiereMfa) {
      expect(data.accessToken).toBeTruthy();
      expect(data.usuario.rol).toBe('TECNICO_EVALUADOR');

      const sesion = await getSession();
      expect(sesion?.accessToken).toBe(data.accessToken);
      expect(sesion?.usuario.nombreCompleto).toBe(data.usuario.nombreCompleto);
    }
  });

  it('propaga el error tal cual cuando el backend responde 401 (credenciales inválidas) y no guarda sesión', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 })
      )
    );

    await expect(login('admin@ebr.local', 'cualquiera')).rejects.toThrow('Credenciales inválidas.');

    const sesion = await getSession();
    expect(sesion).toBeNull();
  });

  it('si el backend no manda un mensaje, arma uno propio con el código de estado', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () => new HttpResponse(null, { status: 500 }))
    );

    await expect(login('admin@ebr.local', 'cualquiera')).rejects.toThrow('Error al iniciar sesión (500)');
  });

  it('descarga el catálogo en Dexie tras login exitoso (necesario para trabajar offline)', async () => {
    await login('tecnico@ebr.local', 'clave-de-prueba');

    const meta = await db.catalogo_meta.get(1);
    expect(meta).toBeTruthy();
    expect(meta?.versionFichaId).toBeTruthy();
    expect(meta?.opcionesRespuesta.length).toBeGreaterThan(0);

    const items = await db.catalogo_item.count();
    expect(items).toBeGreaterThan(0);
  });

  it('descarga también el catálogo del motor de riesgo cuando el rol es TECNICO_EVALUADOR', async () => {
    await login('tecnico@ebr.local', 'clave-de-prueba');

    const catalogoMotor = await db.catalogo_motor.get(1);
    expect(catalogoMotor).toBeTruthy();
  });

  it('descarga también el catálogo del motor de riesgo cuando el rol es COORDINADOR o ADMINISTRADOR', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json({
          accessToken: 'token',
          usuario: { id: '3', nombreCompleto: 'Coordinadora', rol: 'COORDINADOR', empresaId: null },
        })
      )
    );

    await login('coordinadora@ebr.local', 'clave-de-prueba');

    const catalogoMotor = await db.catalogo_motor.get(1);
    expect(catalogoMotor).toBeTruthy();
  });

  it('NO descarga el catálogo del motor de riesgo para ADMINISTRADOR_EMPRESA (el backend responde 403 para ese rol)', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json({
          accessToken: 'token',
          usuario: { id: '4', nombreCompleto: 'Empresa SRL', rol: 'ADMINISTRADOR_EMPRESA', empresaId: '1' },
        })
      ),
      http.get('http://localhost:3000/api/v1/motor-riesgo/catalogo', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      )
    );

    await expect(login('empresa@ebr.local', 'clave-de-prueba')).resolves.toBeTruthy();

    const catalogoMotor = await db.catalogo_motor.get(1);
    expect(catalogoMotor).toBeUndefined();

    // El otro catálogo (formularios/vigente) sí se sigue descargando para este rol.
    const meta = await db.catalogo_meta.get(1);
    expect(meta).toBeTruthy();
  });

  it('NO descarga el catálogo del motor de riesgo para USUARIO_DELEGADO', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json({
          accessToken: 'token',
          usuario: { id: '5', nombreCompleto: 'Delegado', rol: 'USUARIO_DELEGADO', empresaId: '1' },
        })
      ),
      http.get('http://localhost:3000/api/v1/motor-riesgo/catalogo', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
      )
    );

    await login('delegado@ebr.local', 'clave-de-prueba');

    const catalogoMotor = await db.catalogo_motor.get(1);
    expect(catalogoMotor).toBeUndefined();
  });

  it('manda solo correo y password en el cuerpo de la petición (sin captchaToken — el backend ya no lo acepta)', async () => {
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

    await login('tecnico@ebr.local', 'clave-de-prueba');

    expect(cuerpoRecibido).toEqual({
      correo: 'tecnico@ebr.local',
      password: 'clave-de-prueba',
    });
  });

  it('devuelve requiereMfa si el servidor indica que se necesita segundo factor, sin guardar sesión', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json({
          requiereMfa: true,
          mensaje: 'Verificación en dos pasos requerida',
          codigoDemo: '123456',
        })
      )
    );

    const resultado = await login('coordinador@ebr.local', 'clave-de-prueba');
    expect(resultado.requiereMfa).toBe(true);

    const sesion = await getSession();
    expect(sesion).toBeNull();
  });

  it('permite enviar codigoMfa en la petición de login y guarda sesión si es exitoso', async () => {
    let cuerpoRecibido: any = null;
    server.use(
      http.post('http://localhost:3000/api/v1/auth/login', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json({
          accessToken: 'token-mfa',
          usuario: { id: '2', nombreCompleto: 'Coordinador', rol: 'COORDINADOR', empresaId: null },
        });
      })
    );

    const resultado = await login('coordinador@ebr.local', 'clave-de-prueba', '123456');
    expect(resultado.requiereMfa).toBeFalsy();
    expect(cuerpoRecibido).toEqual({
      correo: 'coordinador@ebr.local',
      password: 'clave-de-prueba',
      codigoMfa: '123456',
    });

    const sesion = await getSession();
    expect(sesion?.accessToken).toBe('token-mfa');
  });
});
