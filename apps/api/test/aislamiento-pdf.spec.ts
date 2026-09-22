import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { verificarAccesoEmpresa } from '../src/common/utils/aislamiento-empresa';
import { InformesService } from '../src/modules/informes/informes.service';
import { ExpedientesService } from '../src/modules/expedientes/expedientes.service';
import type { JwtPayload } from '../src/modules/auth/token.service';

const usuario = (rol: string, empresaId: string | null): JwtPayload => ({ sub: '10', rol, empresaId } as JwtPayload);

describe('verificarAccesoEmpresa', () => {
  it.each(['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'])('%s (rol interno) accede a cualquier empresa', (rol) => {
    expect(() => verificarAccesoEmpresa(usuario(rol, null), 7n)).not.toThrow();
  });

  it.each(['ADMINISTRADOR_EMPRESA', 'USUARIO_DELEGADO'])('%s accede a recursos de su propia empresa', (rol) => {
    expect(() => verificarAccesoEmpresa(usuario(rol, '5'), 5n)).not.toThrow();
  });

  it.each(['ADMINISTRADOR_EMPRESA', 'USUARIO_DELEGADO'])('%s NO accede a recursos de otra empresa', (rol) => {
    expect(() => verificarAccesoEmpresa(usuario(rol, '5'), 6n)).toThrow(ForbiddenException);
  });

  it('niega por defecto si el usuario no tiene empresa asignada', () => {
    expect(() => verificarAccesoEmpresa(usuario('ADMINISTRADOR_EMPRESA', null), 5n)).toThrow(ForbiddenException);
  });

  it('niega por defecto si el recurso no tiene empresa', () => {
    expect(() => verificarAccesoEmpresa(usuario('ADMINISTRADOR_EMPRESA', '5'), null)).toThrow(ForbiddenException);
  });

  it('un rol desconocido se trata como rol de empresa: solo accede a la suya (deny-by-default)', () => {
    expect(() => verificarAccesoEmpresa(usuario('ROL_FUTURO', '5'), 5n)).not.toThrow(); // misma empresa
    expect(() => verificarAccesoEmpresa(usuario('ROL_FUTURO', '5'), 6n)).toThrow(ForbiddenException);
  });
});

describe('InformesService.generarPdf — aislamiento entre empresas', () => {
  let prismaMock: any;
  let pdfServiceMock: any;
  let service: InformesService;

  const evaluacionDeEmpresa = (idEmpresa: bigint) => ({
    id: 1n,
    fechaProgramada: null,
    evaluador: { nombreCompleto: 'Técnico' },
    coordinador: null,
    estado: { nombre: 'Aprobada' },
    informe: null,
    calculoRiesgo: null,
    respuestas: [],
    establecimiento: { nombre: 'Planta', idEmpresa, empresa: { razonSocial: 'ACME', rnc: '131000001' } },
  });

  beforeEach(() => {
    prismaMock = { evaluacion: { findUnique: jest.fn() } };
    pdfServiceMock = { generarDocumentoPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-')) };
    service = new InformesService(prismaMock, pdfServiceMock, {} as any, {} as any);
  });

  it('rechaza a un usuario de OTRA empresa y no llega a generar el PDF', async () => {
    prismaMock.evaluacion.findUnique.mockResolvedValue(evaluacionDeEmpresa(1n));

    await expect(service.generarPdf('1', usuario('ADMINISTRADOR_EMPRESA', '3'))).rejects.toThrow(ForbiddenException);
    expect(pdfServiceMock.generarDocumentoPdf).not.toHaveBeenCalled();
  });

  it('entrega el PDF al usuario de la empresa dueña', async () => {
    prismaMock.evaluacion.findUnique.mockResolvedValue(evaluacionDeEmpresa(1n));

    await expect(service.generarPdf('1', usuario('USUARIO_DELEGADO', '1'))).resolves.toBeInstanceOf(Buffer);
    expect(pdfServiceMock.generarDocumentoPdf).toHaveBeenCalledTimes(1);
  });

  it('un Coordinador puede descargar el PDF de cualquier empresa', async () => {
    prismaMock.evaluacion.findUnique.mockResolvedValue(evaluacionDeEmpresa(1n));

    await expect(service.generarPdf('1', usuario('COORDINADOR', null))).resolves.toBeInstanceOf(Buffer);
  });

  it('sigue respondiendo 404 si la evaluación no existe', async () => {
    prismaMock.evaluacion.findUnique.mockResolvedValue(null);

    await expect(service.generarPdf('99', usuario('ADMINISTRADOR_EMPRESA', '1'))).rejects.toThrow(NotFoundException);
  });
});

describe('ExpedientesService.generarPdf — aislamiento entre empresas', () => {
  let prismaMock: any;
  let pdfServiceMock: any;
  let service: ExpedientesService;

  const casoDeEmpresa = (idEmpresa: bigint) => ({
    id: 1n,
    origen: { nombre: 'Solicitud de Empresa' },
    evaluaciones: [],
    expediente: { id: 4n, estado: 'Cerrado', resultadoFinal: 'Aprueba', fechaCierre: null },
    establecimiento: { nombre: 'Planta', idEmpresa, empresa: { razonSocial: 'ACME', rnc: '131000001' } },
  });

  beforeEach(() => {
    prismaMock = { caso: { findUnique: jest.fn() } };
    pdfServiceMock = { generarDocumentoPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-')) };
    service = new ExpedientesService(prismaMock, pdfServiceMock, {} as any, {} as any, {} as any);
  });

  it('rechaza a un usuario de OTRA empresa y no llega a generar el PDF', async () => {
    prismaMock.caso.findUnique.mockResolvedValue(casoDeEmpresa(1n));

    await expect(service.generarPdf('1', usuario('ADMINISTRADOR_EMPRESA', '3'))).rejects.toThrow(ForbiddenException);
    expect(pdfServiceMock.generarDocumentoPdf).not.toHaveBeenCalled();
  });

  it('entrega el PDF al usuario de la empresa dueña', async () => {
    prismaMock.caso.findUnique.mockResolvedValue(casoDeEmpresa(1n));

    await expect(service.generarPdf('1', usuario('ADMINISTRADOR_EMPRESA', '1'))).resolves.toBeInstanceOf(Buffer);
  });

  it('un Administrador interno puede descargar el PDF de cualquier empresa', async () => {
    prismaMock.caso.findUnique.mockResolvedValue(casoDeEmpresa(1n));

    await expect(service.generarPdf('1', usuario('ADMINISTRADOR', null))).resolves.toBeInstanceOf(Buffer);
  });

  it('no revela si el caso tiene expediente a un usuario de otra empresa (403 antes que 404)', async () => {
    prismaMock.caso.findUnique.mockResolvedValue({ ...casoDeEmpresa(1n), expediente: null });

    await expect(service.generarPdf('1', usuario('ADMINISTRADOR_EMPRESA', '3'))).rejects.toThrow(ForbiddenException);
  });
});
