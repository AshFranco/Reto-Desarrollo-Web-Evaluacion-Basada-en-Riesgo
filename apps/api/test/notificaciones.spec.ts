import { NotificacionesService } from '../src/modules/notificaciones/notificaciones.service';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      usuario: { findMany: jest.fn() },
      notificacion: { create: jest.fn() },
    };
    service = new NotificacionesService(prismaMock);
  });

  describe('notificarPorRol', () => {
    it('crea una notificación por cada usuario aprobado con ese rol', async () => {
      prismaMock.usuario.findMany.mockResolvedValue([{ id: 1n }, { id: 2n }]);
      prismaMock.notificacion.create.mockResolvedValue({});

      await service.notificarPorRol('COORDINADOR', {
        tipo: 'SOLICITUD_BPM_RECIBIDA',
        titulo: 'x',
        mensaje: 'y',
      });

      expect(prismaMock.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { estado: 'APROBADO', roles: { some: { rol: { codigo: 'COORDINADOR' } } } },
        }),
      );
      expect(prismaMock.notificacion.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('notificarPorEmpresa', () => {
    it('crea una notificación por cada usuario aprobado de la empresa', async () => {
      prismaMock.usuario.findMany.mockResolvedValue([{ id: 3n }]);
      prismaMock.notificacion.create.mockResolvedValue({});

      await service.notificarPorEmpresa(9n, {
        tipo: 'EXPEDIENTE_CERRADO',
        titulo: 'x',
        mensaje: 'y',
      });

      expect(prismaMock.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: 'APROBADO', idEmpresa: 9n } }),
      );
      expect(prismaMock.notificacion.create).toHaveBeenCalledTimes(1);
    });
  });
});
