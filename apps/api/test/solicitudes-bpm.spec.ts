import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SolicitudesBpmService } from '../src/modules/solicitudes-bpm/solicitudes-bpm.service';

describe('SolicitudesBpmService', () => {
  let service: SolicitudesBpmService;
  let prismaMock: any;
  let notificacionesMock: any;
  let storageMock: any;

  const EMPRESA_ID = '1';
  const user = { sub: '2', rol: 'ADMINISTRADOR_EMPRESA', empresaId: EMPRESA_ID } as any;

  beforeEach(() => {
    prismaMock = {
      solicitudBpm: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      establecimiento: { findUnique: jest.fn() },
      origenCaso: { findUniqueOrThrow: jest.fn() },
      caso: { create: jest.fn() },
      adjuntoSolicitudBpm: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    };
    notificacionesMock = { notificarPorRol: jest.fn() };
    storageMock = { guardar: jest.fn().mockResolvedValue({ claveArchivo: 'clave-123.pdf' }), eliminar: jest.fn() };

    service = new SolicitudesBpmService(prismaMock, notificacionesMock, storageMock);
  });

  describe('enviar', () => {
    it('notifica a los Coordinadores cuando la solicitud se envía', async () => {
      prismaMock.solicitudBpm.findUnique.mockResolvedValue({
        id: 1n,
        idEmpresa: 1n,
        estado: 'Pendiente de Asignacion',
      });
      prismaMock.establecimiento.findUnique.mockResolvedValue({ id: 5n, idEmpresa: 1n });
      prismaMock.origenCaso.findUniqueOrThrow.mockResolvedValue({ id: 1n, codigo: 'SOLICITUD' });
      prismaMock.solicitudBpm.update.mockResolvedValue({ id: 1n, idEmpresa: 1n, idUsuario: 2n, estado: 'Asignada' });

      await service.enviar('1', { establecimientoId: '5' }, user);

      expect(notificacionesMock.notificarPorRol).toHaveBeenCalledWith(
        'COORDINADOR',
        expect.objectContaining({ tipo: 'SOLICITUD_BPM_RECIBIDA' }),
      );
    });
  });

  describe('descartar', () => {
    const borrador = (extra: any = {}) => ({
      id: 7n,
      idEmpresa: 1n,
      estado: 'Pendiente de Asignacion',
      adjuntos: [{ rutaAlmacenamiento: 'a.pdf' }, { rutaAlmacenamiento: 'b.pdf' }],
      ...extra,
    });

    beforeEach(() => {
      prismaMock.solicitudBpm.delete = jest.fn();
    });

    it('rechaza si la solicitud no existe', async () => {
      prismaMock.solicitudBpm.findUnique.mockResolvedValue(null);
      await expect(service.descartar('7', user)).rejects.toThrow(NotFoundException);
      expect(prismaMock.solicitudBpm.delete).not.toHaveBeenCalled();
    });

    it('rechaza descartar la solicitud de otra empresa', async () => {
      prismaMock.solicitudBpm.findUnique.mockResolvedValue(borrador({ idEmpresa: 2n }));
      await expect(service.descartar('7', user)).rejects.toThrow(ForbiddenException);
      expect(prismaMock.solicitudBpm.delete).not.toHaveBeenCalled();
      expect(storageMock.eliminar).not.toHaveBeenCalled();
    });

    it.each([null, undefined, ''])('rechaza a un usuario sin empresa (%p)', async (empresaId) => {
      prismaMock.solicitudBpm.findUnique.mockResolvedValue(borrador());
      await expect(
        service.descartar('7', { sub: '2', rol: 'ADMINISTRADOR_EMPRESA', empresaId } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.solicitudBpm.delete).not.toHaveBeenCalled();
    });

    it.each(['Asignada', 'Rechazada'])('rechaza descartar una solicitud en estado %s', async (estado) => {
      prismaMock.solicitudBpm.findUnique.mockResolvedValue(borrador({ estado }));
      await expect(service.descartar('7', user)).rejects.toThrow(BadRequestException);
      expect(prismaMock.solicitudBpm.delete).not.toHaveBeenCalled();
      expect(storageMock.eliminar).not.toHaveBeenCalled();
    });

    it('borra el borrador y retira sus archivos del almacenamiento', async () => {
      prismaMock.solicitudBpm.findUnique.mockResolvedValue(borrador());

      const res = await service.descartar('7', user);

      expect(prismaMock.solicitudBpm.delete).toHaveBeenCalledWith({ where: { id: 7n } });
      expect(storageMock.eliminar).toHaveBeenCalledWith('a.pdf');
      expect(storageMock.eliminar).toHaveBeenCalledWith('b.pdf');
      expect(res.mensaje).toMatch(/descartado/i);
    });

    it('un fallo al borrar un archivo no deshace el descarte', async () => {
      prismaMock.solicitudBpm.findUnique.mockResolvedValue(borrador());
      storageMock.eliminar.mockRejectedValue(new Error('disco no disponible'));

      await expect(service.descartar('7', user)).resolves.toEqual(expect.objectContaining({ mensaje: expect.any(String) }));
      expect(prismaMock.solicitudBpm.delete).toHaveBeenCalled();
    });
  });

  describe('misSolicitudes', () => {
    it('filtra por la empresa del usuario', async () => {
      prismaMock.solicitudBpm.findMany.mockResolvedValue([]);

      await service.misSolicitudes(user);

      expect(prismaMock.solicitudBpm.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { idEmpresa: 1n } }),
      );
    });

    it.each([null, undefined, ''])(
      'devuelve una lista vacía a un usuario sin empresa (%p) en vez de las solicitudes de todas las empresas',
      async (empresaId) => {
        const res = await service.misSolicitudes({ sub: '2', rol: 'ADMINISTRADOR_EMPRESA', empresaId } as any);
        expect(res).toEqual([]);
        expect(prismaMock.solicitudBpm.findMany).not.toHaveBeenCalled();
      },
    );
  });

  describe('subirAdjunto', () => {
    const file = { buffer: Buffer.from('x'), mimetype: 'application/pdf', size: 10, originalname: 'croquis.pdf' } as any;

    it('rechaza un tipo de adjunto inválido', async () => {
      await expect(service.subirAdjunto('1', file, 'FOTO_PERFIL', user)).rejects.toThrow(BadRequestException);
    });

    it('rechaza si la solicitud no pertenece a la empresa del usuario', async () => {
      prismaMock.solicitudBpm.findUnique.mockResolvedValue({ id: 1n, idEmpresa: 99n, estado: 'Pendiente de Asignacion' });

      await expect(service.subirAdjunto('1', file, 'CROQUIS', user)).rejects.toThrow(ForbiddenException);
    });

    it('rechaza adjuntar a una solicitud ya enviada', async () => {
      prismaMock.solicitudBpm.findUnique.mockResolvedValue({ id: 1n, idEmpresa: 1n, estado: 'Asignada' });

      await expect(service.subirAdjunto('1', file, 'CROQUIS', user)).rejects.toThrow(BadRequestException);
    });

    it('sube el adjunto correctamente', async () => {
      prismaMock.solicitudBpm.findUnique.mockResolvedValue({ id: 1n, idEmpresa: 1n, estado: 'Pendiente de Asignacion' });
      prismaMock.adjuntoSolicitudBpm.create.mockResolvedValue({
        id: 10n,
        idSolicitud: 1n,
        tipo: 'CROQUIS',
        nombreArchivo: 'croquis.pdf',
        tamanoBytes: 10n,
      });

      const resultado = await service.subirAdjunto('1', file, 'CROQUIS', user);

      expect(storageMock.guardar).toHaveBeenCalledWith(file.buffer, file.mimetype);
      expect(resultado.id).toBe('10');
      expect(resultado.tamanoBytes).toBe('10');
    });
  });

  describe('eliminarAdjunto', () => {
    it('rechaza eliminar un adjunto de una solicitud ya enviada', async () => {
      prismaMock.adjuntoSolicitudBpm.findUnique.mockResolvedValue({
        id: 10n,
        idSolicitud: 1n,
        rutaAlmacenamiento: 'clave-123.pdf',
        solicitud: { idEmpresa: 1n, estado: 'Asignada' },
      });

      await expect(service.eliminarAdjunto('10', user)).rejects.toThrow(BadRequestException);
    });

    it('elimina el adjunto y el archivo del storage', async () => {
      prismaMock.adjuntoSolicitudBpm.findUnique.mockResolvedValue({
        id: 10n,
        idSolicitud: 1n,
        rutaAlmacenamiento: 'clave-123.pdf',
        solicitud: { idEmpresa: 1n, estado: 'Pendiente de Asignacion' },
      });

      await service.eliminarAdjunto('10', user);

      expect(storageMock.eliminar).toHaveBeenCalledWith('clave-123.pdf');
      expect(prismaMock.adjuntoSolicitudBpm.delete).toHaveBeenCalledWith({ where: { id: 10n } });
    });
  });
});
