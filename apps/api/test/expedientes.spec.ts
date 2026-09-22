import { BadRequestException } from '@nestjs/common';
import { ExpedientesService } from '../src/modules/expedientes/expedientes.service';

describe('ExpedientesService', () => {
  let service: ExpedientesService;
  let prismaMock: any;
  let pdfServiceMock: any;
  let notificacionesMock: any;
  let emailServiceMock: any;
  let informesServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      caso: { findUnique: jest.fn(), update: jest.fn() },
      estadoEvaluacion: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn() },
      calculoRiesgo: { findUnique: jest.fn() },
      expediente: { upsert: jest.fn() },
      evaluacion: { update: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    };
    pdfServiceMock = { generarDocumentoPdf: jest.fn() };
    notificacionesMock = { notificarPorEmpresa: jest.fn() };
    emailServiceMock = { enviarResultadoExpediente: jest.fn().mockResolvedValue({ ok: true }) };
    informesServiceMock = { generarPdfConMetadatos: jest.fn() };

    service = new ExpedientesService(prismaMock, pdfServiceMock, notificacionesMock, emailServiceMock, informesServiceMock);
  });

  const CASO_ID = '1';

  describe('cerrar', () => {
    it('rechaza si el caso no tiene evaluación aprobada', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        id: 1n,
        evaluaciones: [],
        expediente: null,
        establecimiento: { idEmpresa: 9n },
      });
      prismaMock.estadoEvaluacion.findUniqueOrThrow.mockResolvedValue({ id: 5, codigo: 'APROBADA' });

      await expect(service.cerrar(CASO_ID)).rejects.toThrow(BadRequestException);
    });

    it('cierra el expediente y notifica a la empresa del establecimiento', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        id: 1n,
        evaluaciones: [{ id: 50n, idEstado: 5 }],
        expediente: null,
        establecimiento: { idEmpresa: 9n },
      });
      prismaMock.estadoEvaluacion.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 5, codigo: 'APROBADA' })
        .mockResolvedValueOnce({ id: 7, codigo: 'CERRADA' });
      prismaMock.calculoRiesgo.findUnique.mockResolvedValue({ calificacionTexto: 'Riesgo Bajo' });
      prismaMock.expediente.upsert.mockResolvedValue({
        id: 3n,
        idCaso: 1n,
        estado: 'Cerrado',
        resultadoFinal: 'Riesgo Bajo',
      });

      await service.cerrar(CASO_ID);

      expect(notificacionesMock.notificarPorEmpresa).toHaveBeenCalledWith(
        9n,
        expect.objectContaining({ tipo: 'EXPEDIENTE_CERRADO' }),
      );
    });

    it('envía el acta en PDF (la Ficha BPM completa de InformesService, no el dictamen corto) al correo de la empresa cuando el expediente se cierra', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        id: 1n,
        evaluaciones: [{ id: 50n, idEstado: 5, estado: { codigo: 'APROBADA' } }],
        expediente: null,
        establecimiento: {
          idEmpresa: 9n,
          nombre: 'Planta Santo Domingo',
          empresa: { razonSocial: 'Alimentos del Caribe SRL', correo: 'contacto@alimentoscaribe.com', contactos: [] },
        },
      });
      prismaMock.estadoEvaluacion.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 5, codigo: 'APROBADA' })
        .mockResolvedValueOnce({ id: 7, codigo: 'CERRADA' });
      prismaMock.calculoRiesgo.findUnique.mockResolvedValue({ calificacionTexto: 'Riesgo Bajo' });
      prismaMock.expediente.upsert.mockResolvedValue({
        id: 3n,
        idCaso: 1n,
        estado: 'Cerrado',
        resultadoFinal: 'Riesgo Bajo',
      });
      const pdfBuffer = Buffer.from('pdf-falso');
      informesServiceMock.generarPdfConMetadatos.mockResolvedValue({ buffer: pdfBuffer, nombreArchivo: 'acta.pdf' });

      await service.cerrar(CASO_ID);

      expect(informesServiceMock.generarPdfConMetadatos).toHaveBeenCalledWith('50', expect.objectContaining({ rol: 'ADMINISTRADOR' }));
      expect(emailServiceMock.enviarResultadoExpediente).toHaveBeenCalledWith(
        'contacto@alimentoscaribe.com',
        'Alimentos del Caribe SRL',
        'Planta Santo Domingo',
        'Riesgo Bajo',
        pdfBuffer,
        'acta.pdf',
      );
    });

    it('usa el correo del contacto principal si la empresa no tiene correo propio', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        id: 1n,
        evaluaciones: [{ id: 50n, idEstado: 5, estado: { codigo: 'APROBADA' } }],
        expediente: null,
        establecimiento: {
          idEmpresa: 9n,
          nombre: 'Planta Santo Domingo',
          empresa: {
            razonSocial: 'Alimentos del Caribe SRL',
            correo: null,
            contactos: [
              { tipoContacto: { codigo: 'LEGAL' }, correo: 'legal@alimentoscaribe.com' },
              { tipoContacto: { codigo: 'PRINCIPAL' }, correo: 'principal@alimentoscaribe.com' },
            ],
          },
        },
      });
      prismaMock.estadoEvaluacion.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 5, codigo: 'APROBADA' })
        .mockResolvedValueOnce({ id: 7, codigo: 'CERRADA' });
      prismaMock.calculoRiesgo.findUnique.mockResolvedValue({ calificacionTexto: 'Riesgo Bajo' });
      prismaMock.expediente.upsert.mockResolvedValue({ id: 3n, idCaso: 1n, estado: 'Cerrado', resultadoFinal: 'Riesgo Bajo' });
      informesServiceMock.generarPdfConMetadatos.mockResolvedValue({ buffer: Buffer.from('x'), nombreArchivo: 'acta.pdf' });

      await service.cerrar(CASO_ID);

      expect(emailServiceMock.enviarResultadoExpediente).toHaveBeenCalledWith(
        'principal@alimentoscaribe.com',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('no revierte el cierre del expediente si el envío del correo falla', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        id: 1n,
        evaluaciones: [{ id: 50n, idEstado: 5, estado: { codigo: 'APROBADA' } }],
        expediente: null,
        establecimiento: {
          idEmpresa: 9n,
          nombre: 'Planta Santo Domingo',
          empresa: { razonSocial: 'Alimentos del Caribe SRL', correo: 'contacto@alimentoscaribe.com', contactos: [] },
        },
      });
      prismaMock.estadoEvaluacion.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 5, codigo: 'APROBADA' })
        .mockResolvedValueOnce({ id: 7, codigo: 'CERRADA' });
      prismaMock.calculoRiesgo.findUnique.mockResolvedValue({ calificacionTexto: 'Riesgo Bajo' });
      prismaMock.expediente.upsert.mockResolvedValue({ id: 3n, idCaso: 1n, estado: 'Cerrado', resultadoFinal: 'Riesgo Bajo' });
      informesServiceMock.generarPdfConMetadatos.mockRejectedValue(new Error('PDF roto'));

      await expect(service.cerrar(CASO_ID)).resolves.toEqual(
        expect.objectContaining({ estado: 'Cerrado' }),
      );
    });
  });
});
