import { BadRequestException } from '@nestjs/common';
import { ExpedientesService } from '../src/modules/expedientes/expedientes.service';

describe('ExpedientesService', () => {
  let service: ExpedientesService;
  let prismaMock: any;
  let pdfServiceMock: any;
  let notificacionesMock: any;

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

    service = new ExpedientesService(prismaMock, pdfServiceMock, notificacionesMock);
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
  });
});
