import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CasosService } from '../src/modules/casos/casos.service';
import { EvidenciasService } from '../src/modules/evidencias/evidencias.service';
import { StorageService } from '../src/common/services/storage.service';

describe('Casos, Evidencias & Storage Services', () => {
  describe('CasosService - Scoping y Búsqueda Histórica', () => {
    let service: CasosService;
    let prismaMock: any;

    beforeEach(() => {
      prismaMock = {
        caso: {
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn(),
        },
      };
      service = new CasosService(prismaMock);
    });

    it('listar() para rol interno no filtra por empresa', async () => {
      await service.listar({ sub: '1', rol: 'COORDINADOR', empresaId: null });

      expect(prismaMock.caso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('listar() para rol de empresa fuerza el filtro por su propia empresa', async () => {
      await service.listar({ sub: '2', rol: 'ADMINISTRADOR_EMPRESA', empresaId: '88' });

      expect(prismaMock.caso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { establecimiento: { idEmpresa: 88n } },
        }),
      );
    });

    it('buscarHistorico() ignora empresaId enviado por usuario de empresa evitando spoofing', async () => {
      await service.buscarHistorico(
        { empresaId: '999', estado: 'Cerrado' }, // Intento de consultar otra empresa
        { sub: '2', rol: 'ADMINISTRADOR_EMPRESA', empresaId: '88' },
      );

      expect(prismaMock.caso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: 'Cerrado',
            establecimiento: { idEmpresa: 88n }, // Prevalece la empresa del token JWT
          }),
        }),
      );
    });

    it('buscarHistorico() para rol interno sí permite filtrar por cualquier empresa', async () => {
      await service.buscarHistorico(
        { empresaId: '35', estado: 'Pendiente' },
        { sub: '1', rol: 'ADMINISTRADOR', empresaId: null },
      );

      expect(prismaMock.caso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: 'Pendiente',
            establecimiento: { idEmpresa: 35n },
          }),
        }),
      );
    });
  });

  describe('EvidenciasService & StorageService', () => {
    let evidenciasService: EvidenciasService;
    let prismaMock: any;
    let storageMock: any;

    beforeEach(() => {
      prismaMock = {
        evaluacion: { findUnique: jest.fn() },
        evidencia: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      };
      storageMock = {
        guardar: jest.fn().mockResolvedValue({ claveArchivo: 'uuid-1234.jpg' }),
        eliminar: jest.fn().mockResolvedValue(undefined),
      };
      evidenciasService = new EvidenciasService(prismaMock, storageMock);
    });

    const mockFile: any = {
      buffer: Buffer.from('fake-image-bytes'),
      mimetype: 'image/jpeg',
      size: 1024,
    };

    it('rechaza subir evidencia si la evaluación no existe', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue(null);

      await expect(
        evidenciasService.subir(mockFile, { evaluacionId: '10', tipo: 'FOTO' }, '5'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza subir evidencia si la evaluación no está asignada al técnico', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 10n,
        idEvaluador: 99n,
      });

      await expect(
        evidenciasService.subir(mockFile, { evaluacionId: '10', tipo: 'FOTO' }, '5'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza subir evidencia si la evaluación ya está bloqueada', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 10n,
        idEvaluador: 5n,
        bloqueada: true,
      });

      await expect(
        evidenciasService.subir(mockFile, { evaluacionId: '10', tipo: 'FOTO' }, '5'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('guarda exitosamente la evidencia con clave opaca cuando la evaluación está en curso', async () => {
      prismaMock.evaluacion.findUnique.mockResolvedValue({
        id: 10n,
        idEvaluador: 5n,
        bloqueada: false,
      });
      prismaMock.evidencia.create.mockResolvedValue({
        id: 1n,
        idEvaluacion: 10n,
        nombreArchivo: 'uuid-1234.jpg',
        rutaAlmacenamiento: 'uuid-1234.jpg',
        tipoMime: 'image/jpeg',
        tamanoBytes: 1024n,
      });

      const res = await evidenciasService.subir(mockFile, { evaluacionId: '10', tipo: 'FOTO' }, '5');
      expect(res.nombreArchivo).toBe('uuid-1234.jpg');
      expect(storageMock.guardar).toHaveBeenCalledWith(mockFile.buffer, 'image/jpeg');
    });

    it('rechaza eliminar evidencia si la evidencia no existe', async () => {
      prismaMock.evidencia.findUnique.mockResolvedValue(null);

      await expect(evidenciasService.eliminar('99', '5')).rejects.toThrow(NotFoundException);
    });

    it('rechaza eliminar evidencia si la evaluación no pertenece al técnico', async () => {
      prismaMock.evidencia.findUnique.mockResolvedValue({
        id: 99n,
        evaluacion: { idEvaluador: 10n, bloqueada: false },
      });

      await expect(evidenciasService.eliminar('99', '5')).rejects.toThrow(ForbiddenException);
    });

    it('rechaza eliminar evidencia si la evaluación está bloqueada', async () => {
      prismaMock.evidencia.findUnique.mockResolvedValue({
        id: 99n,
        evaluacion: { idEvaluador: 5n, bloqueada: true },
      });

      await expect(evidenciasService.eliminar('99', '5')).rejects.toThrow(ForbiddenException);
    });

    it('elimina exitosamente la evidencia de almacenamiento y de la base de datos', async () => {
      prismaMock.evidencia.findUnique.mockResolvedValue({
        id: 99n,
        rutaAlmacenamiento: 'foto-123.jpg',
        evaluacion: { idEvaluador: 5n, bloqueada: false },
      });
      prismaMock.evidencia.delete.mockResolvedValue({ id: 99n });

      const res = await evidenciasService.eliminar('99', '5');
      expect(res).toEqual({ mensaje: 'Evidencia eliminada correctamente.' });
      expect(storageMock.eliminar).toHaveBeenCalledWith('foto-123.jpg');
      expect(prismaMock.evidencia.delete).toHaveBeenCalledWith({ where: { id: 99n } });
    });

    it('StorageService asigna extensiones basadas en MIME para prevenir ejecución arbitraria', () => {
      const configMock: any = { storageLocalPath: './storage/uploads' };
      const storage = new StorageService(configMock);
      const extJpg = (storage as any).extensionParaMime('image/jpeg');
      const extPng = (storage as any).extensionParaMime('image/png');
      const extPdf = (storage as any).extensionParaMime('application/pdf');
      const extExe = (storage as any).extensionParaMime('application/x-msdownload');

      expect(extJpg).toBe('.jpg');
      expect(extPng).toBe('.png');
      expect(extPdf).toBe('.pdf');
      expect(extExe).toBe(''); // No permite extensiones ejecutables
    });
  });
});
