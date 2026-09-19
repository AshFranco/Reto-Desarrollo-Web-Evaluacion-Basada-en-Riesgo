import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { saveSession } from '@/lib/auth/session';
import { MOCK_DENUNCIA } from '@/mocks/handlers';
import { denunciaPublica, listarEmpresasPublicas, type DatosDenunciaPublica } from './denunciaPublica';

beforeEach(() => db.open());
afterEach(() => db.delete());

const DATOS: DatosDenunciaPublica = {
  fechaRecepcion: '2026-04-01',
  descripcion: 'Malos olores y presencia de plagas.',
};

describe('denunciaPublica', () => {
  it('con datos válidos devuelve la denuncia creada', async () => {
    const data = await denunciaPublica(DATOS);

    expect(data).toEqual(MOCK_DENUNCIA);
  });

  it('NO manda ningún header Authorization, aunque haya una sesión guardada', async () => {
    await saveSession({
      accessToken: 'token-de-otra-sesion',
      usuario: { id: '1', nombreCompleto: 'Coordinador de prueba', rol: 'COORDINADOR', empresaId: null },
    });

    let headerAuthRecibido: string | null = null;
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', ({ request }) => {
        headerAuthRecibido = request.headers.get('Authorization');
        return HttpResponse.json(MOCK_DENUNCIA, { status: 201 });
      })
    );

    await denunciaPublica(DATOS);

    expect(headerAuthRecibido).toBeNull();
  });

  it('propaga el error tal cual cuando el backend responde 400', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', () =>
        HttpResponse.json({ message: 'fechaRecepcion debe ser una fecha válida.' }, { status: 400 })
      )
    );

    await expect(denunciaPublica(DATOS)).rejects.toThrow('fechaRecepcion debe ser una fecha válida.');
  });

  it('si el backend no manda un mensaje, arma uno propio con el código de estado', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', () => new HttpResponse(null, { status: 500 }))
    );

    await expect(denunciaPublica(DATOS)).rejects.toThrow('Error al registrar la denuncia (500)');
  });

  it('NO manda denunciante cuando se omite (denuncia anónima)', async () => {
    let cuerpoRecibido: unknown = null;
    server.use(
      http.post('http://localhost:3000/api/v1/denuncias', async ({ request }) => {
        cuerpoRecibido = await request.json();
        return HttpResponse.json(MOCK_DENUNCIA, { status: 201 });
      })
    );

    await denunciaPublica(DATOS);

    expect(cuerpoRecibido).toEqual(DATOS);
  });
});

describe('listarEmpresasPublicas', () => {
  it('devuelve la lista de empresas sin mandar Authorization', async () => {
    await saveSession({
      accessToken: 'token-de-otra-sesion',
      usuario: { id: '1', nombreCompleto: 'Coordinador de prueba', rol: 'COORDINADOR', empresaId: null },
    });

    let headerAuthRecibido: string | null = null;
    server.use(
      http.get('http://localhost:3000/api/v1/empresas/publicas', ({ request }) => {
        headerAuthRecibido = request.headers.get('Authorization');
        return HttpResponse.json([{ id: '1', razonSocial: 'Empresa de Prueba SRL', rnc: '130000001', nombreComercial: null }]);
      })
    );

    const empresas = await listarEmpresasPublicas();

    expect(headerAuthRecibido).toBeNull();
    expect(empresas).toEqual([{ id: '1', razonSocial: 'Empresa de Prueba SRL', rnc: '130000001', nombreComercial: null }]);
  });
});
