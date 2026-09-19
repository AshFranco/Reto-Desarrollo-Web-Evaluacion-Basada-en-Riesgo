import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AsignacionesService } from '../src/modules/asignaciones/asignaciones.service';

describe('AsignacionesService', () => {
  let service: AsignacionesService;
  let prismaMock: any;
  let notificacionesMock: any;

  beforeEach(() => {
    prismaMock = {
      usuario: { findUnique: jest.fn() },
      caso: { findUnique: jest.fn(), update: jest.fn() },
      versionFicha: { findFirst: jest.fn() },
      versionMatrizRiesgo: { findFirst: jest.fn() },
      estadoEvaluacion: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
      asignacionEvaluador: { updateMany: jest.fn(), create: jest.fn() },
      evaluacion: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    };
    notificacionesMock = { crear: jest.fn() };

    service = new AsignacionesService(prismaMock, notificacionesMock);
  });

  const COORDINADOR_ID = '5';
  const EVALUADOR_ID = '10';
  const CASO_ID = '1';

  describe('asignar', () => {
    it('rechaza si el usuario indicado no es Técnico Evaluador', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 10n,
        roles: [{ rol: { codigo: 'COORDINADOR' } }],
      });

      await expect(
        service.asignar({ evaluadorId: EVALUADOR_ID, casoId: CASO_ID }, COORDINADOR_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza si el caso no existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 10n,
        roles: [{ rol: { codigo: 'TECNICO_EVALUADOR' } }],
      });
      prismaMock.caso.findUnique.mockResolvedValue(null);

      await expect(
        service.asignar({ evaluadorId: EVALUADOR_ID, casoId: CASO_ID }, COORDINADOR_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('asigna al técnico, crea la evaluación y lo notifica', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 10n,
        roles: [{ rol: { codigo: 'TECNICO_EVALUADOR' } }],
      });
      prismaMock.caso.findUnique.mockResolvedValue({ id: 1n, idEstablecimiento: 3n });
      prismaMock.versionFicha.findFirst.mockResolvedValue({ id: 1n });
      prismaMock.versionMatrizRiesgo.findFirst.mockResolvedValue({ id: 1n });
      prismaMock.estadoEvaluacion.findUnique.mockResolvedValue({ id: 1, codigo: 'PROGRAMADA' });
      prismaMock.asignacionEvaluador.create.mockResolvedValue({ id: 100n, idCaso: 1n });
      prismaMock.evaluacion.findFirst.mockResolvedValue(null);
      prismaMock.evaluacion.create.mockResolvedValue({ id: 200n, idEvaluador: 10n });

      const resultado = await service.asignar({ evaluadorId: EVALUADOR_ID, casoId: CASO_ID }, COORDINADOR_ID);

      expect(resultado.evaluacionId).toBe('200');
      expect(notificacionesMock.crear).toHaveBeenCalledWith(
        expect.objectContaining({ idUsuario: EVALUADOR_ID, tipo: 'ASIGNACION_EVALUACION' }),
      );
    });
  });
});
