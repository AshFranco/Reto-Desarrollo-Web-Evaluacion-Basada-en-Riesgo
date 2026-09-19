import { BadRequestException } from '@nestjs/common';
import { InformesService } from '../src/modules/informes/informes.service';

describe('InformesService', () => {
  let service: InformesService;
  let prismaMock: any;
  let pdfServiceMock: any;
  let notificacionesMock: any;

  beforeEach(() => {
    prismaMock = {
      evaluacion: { findUnique: jest.fn(), update: jest.fn() },
      estadoEvaluacion: { findUniqueOrThrow: jest.fn() },
      historialEstado: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    };
    pdfServiceMock = { generarDocumentoPdf: jest.fn() };
    notificacionesMock = { crear: jest.fn() };

    service = new InformesService(prismaMock, pdfServiceMock, notificacionesMock);
  });

  const EVALUACION_ID = '50';
  const COORDINADOR_ID = '5';

  describe('revisar', () => {
    it('rechaza si la evaluación no está en revisión', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({ id: 50n, idEstado: 1, idEvaluador: 10n });
      prismaMock.estadoEvaluacion.findUniqueOrThrow.mockResolvedValue({ id: 4, codigo: 'EN_REVISION' });

      await expect(
        service.revisar(EVALUACION_ID, { accion: 'APROBAR' } as any, COORDINADOR_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('notifica al técnico cuando el informe es aprobado', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({ id: 50n, idEstado: 4, idEvaluador: 10n });
      prismaMock.estadoEvaluacion.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 4, codigo: 'EN_REVISION' })
        .mockResolvedValueOnce({ id: 5, codigo: 'APROBADA' });
      prismaMock.evaluacion.update.mockResolvedValue({ id: 50n, idEstado: 5 });

      await service.revisar(EVALUACION_ID, { accion: 'APROBAR' } as any, COORDINADOR_ID);

      expect(notificacionesMock.crear).toHaveBeenCalledWith(
        expect.objectContaining({ idUsuario: 10n, tipo: 'INFORME_APROBADO' }),
      );
    });

    it('notifica al técnico cuando el informe es devuelto, incluyendo observaciones', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({ id: 50n, idEstado: 4, idEvaluador: 10n });
      prismaMock.estadoEvaluacion.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 4, codigo: 'EN_REVISION' })
        .mockResolvedValueOnce({ id: 6, codigo: 'DEVUELTA' });
      prismaMock.evaluacion.update.mockResolvedValue({ id: 50n, idEstado: 6 });

      await service.revisar(
        EVALUACION_ID,
        { accion: 'DEVOLVER', observaciones: 'Falta evidencia fotográfica' } as any,
        COORDINADOR_ID,
      );

      expect(notificacionesMock.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          idUsuario: 10n,
          tipo: 'INFORME_DEVUELTO',
          mensaje: expect.stringContaining('Falta evidencia fotográfica'),
        }),
      );
    });
  });
});
