import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EvaluacionesService } from '../src/modules/evaluaciones/evaluaciones.service';

describe('EvaluacionesService', () => {
  let service: EvaluacionesService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      evaluacion: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      estadoEvaluacion: {
        findUniqueOrThrow: jest.fn(),
      },
      historialEstado: {
        create: jest.fn(),
      },
      opcionRespuesta: {
        findMany: jest.fn(),
      },
      nivelCriticidad: {
        findMany: jest.fn(),
      },
      versionFicha: {
        findUniqueOrThrow: jest.fn(),
      },
      itemFicha: {
        count: jest.fn(),
      },
      respuestaItem: {
        count: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (fns) => Promise.all(fns)),
    };

    service = new EvaluacionesService(prismaMock);
  });

  const EVALUADOR_ID = '10';
  const OTRO_EVALUADOR_ID = '99';
  const EVALUACION_ID = '50';

  describe('Acceso y Propiedad', () => {
    it('rechaza si la evaluación no existe', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue(null);

      await expect(service.obtener(EVALUACION_ID, EVALUADOR_ID)).rejects.toThrow(NotFoundException);
    });

    it('rechaza con Forbidden si la evaluación no está asignada al técnico consultor', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 50n,
        idEvaluador: 99n,
      });

      await expect(service.obtener(EVALUACION_ID, EVALUADOR_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('iniciar()', () => {
    it('falla si la evaluación no está en estado PROGRAMADA', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 50n,
        idEvaluador: 10n,
        idEstado: 2, // EN_CURSO
      });
      prismaMock.estadoEvaluacion.findUniqueOrThrow.mockResolvedValue({ id: 1, codigo: 'PROGRAMADA' });

      await expect(service.iniciar(EVALUACION_ID, EVALUADOR_ID)).rejects.toThrow(BadRequestException);
    });

    it('cambia estado a EN_CURSO y registra historial', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 50n,
        idEvaluador: 10n,
        idEstado: 1, // PROGRAMADA
      });
      prismaMock.estadoEvaluacion.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 1, codigo: 'PROGRAMADA' })
        .mockResolvedValueOnce({ id: 2, codigo: 'EN_CURSO' });
      prismaMock.evaluacion.update.mockResolvedValue({
        id: 50n,
        idEvaluador: 10n,
        idEstado: 2,
      });

      const res = await service.iniciar(EVALUACION_ID, EVALUADOR_ID);
      expect(res.id).toBe('50');
      expect(prismaMock.evaluacion.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: expect.objectContaining({ idEstado: 2, fechaInicio: expect.any(Date) }),
      });
      expect(prismaMock.historialEstado.create).toHaveBeenCalled();
    });
  });

  describe('registrarRespuestas()', () => {
    it('rechaza si la evaluación está bloqueada (post-envío)', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 50n,
        idEvaluador: 10n,
        bloqueada: true,
      });

      await expect(
        service.registrarRespuestas(EVALUACION_ID, EVALUADOR_ID, { respuestas: [] }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('exige nivel de criticidad para respuestas con hallazgo (IT o CP)', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 50n,
        idEvaluador: 10n,
        bloqueada: false,
        idVersionFicha: 1n,
      });
      prismaMock.opcionRespuesta.findMany.mockResolvedValue([
        { id: 1n, codigo: 'IT', valor: 0, excluyeDelCalculo: false },
      ]);
      prismaMock.nivelCriticidad.findMany.mockResolvedValue([]);

      await expect(
        service.registrarRespuestas(EVALUACION_ID, EVALUADOR_ID, {
          respuestas: [
            { itemId: '100', codigoOpcion: 'IT', observacion: 'Paredes sucias' }, // falta nivelCriticidad
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite guardar respuestas válidas con idempotencia upsert', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 50n,
        idEvaluador: 10n,
        bloqueada: false,
        idVersionFicha: 1n,
      });
      prismaMock.opcionRespuesta.findMany.mockResolvedValue([
        { id: 1n, codigo: 'C', valor: 1, excluyeDelCalculo: false },
      ]);
      prismaMock.nivelCriticidad.findMany.mockResolvedValue([]);

      const res = await service.registrarRespuestas(EVALUACION_ID, EVALUADOR_ID, {
        respuestas: [{ itemId: '100', codigoOpcion: 'C' }],
      });

      expect(res.mensaje).toBe('Avance guardado.');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('finalizar()', () => {
    it('rechaza si la evaluación ya fue finalizada/bloqueada previamente', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 50n,
        idEvaluador: 10n,
        bloqueada: true,
      });

      await expect(service.finalizar(EVALUACION_ID, EVALUADOR_ID, {})).rejects.toThrow(ForbiddenException);
    });

    it('rechaza si faltan ítems por responder', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 50n,
        idEvaluador: 10n,
        bloqueada: false,
        idVersionFicha: 1n,
      });
      prismaMock.versionFicha.findUniqueOrThrow.mockResolvedValue({ id: 1n });
      prismaMock.itemFicha.count.mockResolvedValue(45);
      prismaMock.respuestaItem.count.mockResolvedValue(40); // Faltan 5

      await expect(service.finalizar(EVALUACION_ID, EVALUADOR_ID, {})).rejects.toThrow(BadRequestException);
    });

    it('finaliza exitosamente, bloquea la evaluación y registra historial', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 50n,
        idEvaluador: 10n,
        bloqueada: false,
        idVersionFicha: 1n,
        idEstado: 2,
      });
      prismaMock.versionFicha.findUniqueOrThrow.mockResolvedValue({ id: 1n });
      prismaMock.itemFicha.count.mockResolvedValue(45);
      prismaMock.respuestaItem.count.mockResolvedValue(45); // Completo
      prismaMock.estadoEvaluacion.findUniqueOrThrow.mockResolvedValue({ id: 3, codigo: 'FINALIZADA' });
      prismaMock.evaluacion.update.mockResolvedValue({
        id: 50n,
        idEvaluador: 10n,
        bloqueada: true,
        idEstado: 3,
      });

      const res = await service.finalizar(EVALUACION_ID, EVALUADOR_ID, {});
      expect(res.bloqueada).toBe(true);
      expect(prismaMock.evaluacion.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: expect.objectContaining({
          bloqueada: true,
          idEstado: 3,
          fechaFinalizacion: expect.any(Date),
        }),
      });
      expect(prismaMock.historialEstado.create).toHaveBeenCalled();
    });
  });
});
