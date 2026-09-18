import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CalendarioService } from '../src/modules/calendario/calendario.service';

describe('CalendarioService', () => {
  let service: CalendarioService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      evaluacion: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      estadoEvaluacion: {
        findFirst: jest.fn(),
      },
    };

    service = new CalendarioService(prismaMock);
  });

  const EVALUACION_ID = '50';

  describe('cancelar', () => {
    it('rechaza si la evaluación no existe', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue(null);

      await expect(service.cancelar(EVALUACION_ID)).rejects.toThrow(NotFoundException);
    });

    it('falla explícito si el catálogo estado_evaluacion no tiene CANCELADA/CANCELADO, en vez de responder éxito sin cambiar nada', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({ id: 50n, idEstado: 1n, idEvaluador: 10n });
      prismaMock.estadoEvaluacion.findFirst.mockResolvedValue(null);

      await expect(service.cancelar(EVALUACION_ID)).rejects.toThrow(InternalServerErrorException);
      expect(prismaMock.evaluacion.update).not.toHaveBeenCalled();
    });

    it('actualiza idEstado al de CANCELADA cuando el catálogo sí lo tiene', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({ id: 50n, idEstado: 1n, idEvaluador: 10n });
      prismaMock.estadoEvaluacion.findFirst.mockResolvedValue({ id: 8n, codigo: 'CANCELADA' });
      prismaMock.evaluacion.update.mockResolvedValue({ id: 50n, idEstado: 8n, idEvaluador: 10n });

      const resultado = await service.cancelar(EVALUACION_ID);

      expect(prismaMock.evaluacion.update).toHaveBeenCalledWith({
        where: { id: 50n },
        data: { idEstado: 8n },
      });
      expect(resultado.evaluacion.idEstado).toBe(8n);
    });
  });
});
