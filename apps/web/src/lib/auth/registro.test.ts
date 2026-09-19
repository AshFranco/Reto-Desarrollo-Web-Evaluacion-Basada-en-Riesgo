import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { MOCK_REGISTRO_RESPONSE } from '@/mocks/handlers';
import { registro, type DatosRegistro } from './registro';

beforeEach(() => db.open());
afterEach(() => db.delete());

const DATOS: DatosRegistro = {
  nombreCompleto: 'Usuario Nuevo',
  cedulaPasaporte: '001-1234567-8',
  correo: 'nuevo@ebr.local',
  telefono: '+18095551234',
  password: 'ClaveSegura#123',
  rol: 'ADMINISTRADOR_EMPRESA',
  empresaId: '1',
};

describe('registro', () => {
  it('con datos válidos devuelve el mensaje y el usuario creado', async () => {
    const data = await registro(DATOS);

    expect(data).toEqual(MOCK_REGISTRO_RESPONSE);
  });

  it('NO guarda ninguna sesión (el usuario queda pendiente de aprobación)', async () => {
    const { getSession } = await import('./session');
    await registro(DATOS);

    const sesion = await getSession();
    expect(sesion).toBeNull();
  });

  it('propaga el error tal cual cuando el backend responde 400 (correo/cédula duplicados)', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/registro', () =>
        HttpResponse.json({ message: 'Ya existe un usuario con ese correo o cédula.' }, { status: 400 })
      )
    );

    await expect(registro(DATOS)).rejects.toThrow('Ya existe un usuario con ese correo o cédula.');
  });

  it('une los mensajes de class-validator cuando el backend manda un array', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/registro', () =>
        HttpResponse.json({ message: ['La empresa indicada no existe.'] }, { status: 400 })
      )
    );

    await expect(registro(DATOS)).rejects.toThrow('La empresa indicada no existe.');
  });

  it('si el backend no manda un mensaje, arma uno propio con el código de estado', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/registro', () => new HttpResponse(null, { status: 500 }))
    );

    await expect(registro(DATOS)).rejects.toThrow('Error al registrarse (500)');
  });

  it('manda exactamente los campos del DTO, sin agregar ninguno extra', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/auth/registro', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(MOCK_REGISTRO_RESPONSE, { status: 201 });
      })
    );

    await registro(DATOS);

    expect(cuerpoRecibido).toEqual(DATOS);
  });

  it('incluye cartaAutorizacionUrl cuando se manda (campo agregado en develop, RegistroUsuarioDto)', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/auth/registro', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(MOCK_REGISTRO_RESPONSE, { status: 201 });
      })
    );

    await registro({ ...DATOS, cartaAutorizacionUrl: 'https://storage.example.com/cartas/carta-001.pdf' });

    expect(cuerpoRecibido).toEqual({
      ...DATOS,
      cartaAutorizacionUrl: 'https://storage.example.com/cartas/carta-001.pdf',
    });
  });
});
