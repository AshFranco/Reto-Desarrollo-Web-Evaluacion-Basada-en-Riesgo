import { inflateSync } from 'zlib';
import { InformesService } from '../src/modules/informes/informes.service';
import { ExpedientesService } from '../src/modules/expedientes/expedientes.service';
import { PdfService, type DocumentoPdfData } from '../src/common/services/pdf.service';
import type { JwtPayload } from '../src/modules/auth/token.service';

/** Texto visible del PDF: se inflan los streams y se unen las cadenas hexadecimales de cada fragmento. */
function textoDelPdf(buffer: Buffer): string {
  const bruto = buffer.toString('latin1');
  const partes: string[] = [];
  const stream = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = stream.exec(bruto))) {
    let contenido: string;
    try {
      contenido = inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
    } catch {
      continue;
    }
    const hex = /<([0-9a-fA-F]+)>/g;
    let h: RegExpExecArray | null;
    while ((h = hex.exec(contenido))) partes.push(Buffer.from(h[1], 'hex').toString('latin1'));
  }
  return partes.join('');
}

/**
 * Rowlis ya cubrió (en develop) que sin resultado calculado se muestre N/A y el sello diga
 * "PENDIENTE DE DICTAMEN", con hash real. Lo que faltaba: varios campos seguían con nombres y
 * códigos de ejemplo como valor por defecto aunque SÍ hubiera resultado, solo por faltar ese
 * dato puntual (técnico sin asignar, sin municipio, sin motivo, sin permiso...). Este archivo
 * cubre justo esos casos, sin repetir lo que ya prueba pdf.service.spec.ts.
 */
describe('PDF: campos individuales sin dato real también muestran N/A (no un ejemplo)', () => {
  const admin = { sub: '1', rol: 'ADMINISTRADOR', empresaId: null } as JwtPayload;

  describe('InformesService.generarPdf', () => {
    const evaluacionBase = (extra: any = {}) => ({
      id: 5n,
      fechaProgramada: new Date('2026-09-01T00:00:00.000Z'),
      fechaInicio: new Date('2026-09-01T00:00:00.000Z'),
      fechaFinalizacion: new Date('2026-09-05T00:00:00.000Z'),
      fechaRevision: null,
      evaluador: null,
      coordinador: null,
      estado: { codigo: 'APROBADA', nombre: 'Aprobada' },
      versionFicha: { numeroVersion: '2024', estado: 'Activa' },
      caso: null,
      informe: null,
      calculoRiesgo: { nivelRiesgo: { nombre: 'Bajo' } },
      respuestas: [],
      establecimiento: {
        id: 9n, idEmpresa: 1n, nombre: 'Planta', numeroPermisoSanitario: null, municipio: null, dpsDas: null, contactos: [],
        empresa: { razonSocial: 'ACME SRL', rnc: '131000001', contactos: [] },
      },
      ...extra,
    });

    async function generar(evaluacion: any) {
      const prisma = { evaluacion: { findUnique: jest.fn().mockResolvedValue(evaluacion) } };
      const pdfMock = { generarDocumentoPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-')) };
      await new InformesService(prisma as any, pdfMock as any, {} as any, {} as any).generarPdf('5', admin);
      return pdfMock.generarDocumentoPdf.mock.calls[0][0] as DocumentoPdfData;
    }

    it('sin técnico asignado: N/A en vez de "Lic. Roberto Morales"', async () => {
      const d = await generar(evaluacionBase());
      expect(d.datosControlInterno?.tecnicoEvaluador).toBe('N/A');
      expect(d.tecnicoNombre).toBeUndefined();
      expect(d.tecnicoRegistro).toBe('N/A');
    });

    it('sin coordinador asignado: N/A en vez de "Ing. Carlos Peña", y sin certificado de firma', async () => {
      const d = await generar(evaluacionBase());
      expect(d.datosControlInterno?.coordinadorRevisor).toBe('N/A');
      expect(d.coordinadorNombre).toBeUndefined();
      expect(d.coordinadorCertificado).toBeUndefined();
    });

    it('sin caso/origen: N/A en vez de "Vigilancia Sanitaria Regular"', async () => {
      const d = await generar(evaluacionBase({ caso: null }));
      expect(d.datosControlInterno?.motivoInspeccion).toBe('N/A');
    });

    it('sin número de permiso sanitario: N/A en vez de un código PS-SAN- inventado', async () => {
      const d = await generar(evaluacionBase());
      expect(d.datosControlInterno?.noPermisoSanitario).toBe('N/A');
      expect(d.datosControlInterno?.noPermisoSanitario).not.toMatch(/^PS-SAN-/);
    });

    it('sin municipio ni DPS: N/A (no "Santo Domingo Este (DPS II)")', async () => {
      const d = await generar(evaluacionBase());
      expect(d.datosEstablecimiento?.municipioDps).toBe('N/A');
    });

    it('con solo el municipio (sin DPS ni provincia) muestra ese dato, no el par completo de ejemplo', async () => {
      const d = await generar(evaluacionBase({ establecimiento: { ...evaluacionBase().establecimiento, municipio: { nombre: 'Santiago' } } }));
      expect(d.datosEstablecimiento?.municipioDps).toBe('Santiago');
    });

    it('con todos los datos reales, ninguno de los campos anteriores queda en N/A', async () => {
      const d = await generar(
        evaluacionBase({
          evaluador: { id: 3n, nombreCompleto: 'Tecnico Real' },
          coordinador: { id: 4n, nombreCompleto: 'Coordinadora Real' },
          caso: { origen: { nombre: 'Solicitud de Empresa' } },
          establecimiento: {
            ...evaluacionBase().establecimiento,
            numeroPermisoSanitario: 'PS-77',
            municipio: { nombre: 'Santiago', provincia: { nombre: 'Santiago' } },
          },
        }),
      );
      expect(d.datosControlInterno?.tecnicoEvaluador).toBe('Tecnico Real (TEC-03)');
      expect(d.datosControlInterno?.coordinadorRevisor).toBe('Coordinadora Real (DIGEMAPS)');
      expect(d.datosControlInterno?.motivoInspeccion).toBe('Solicitud de Empresa');
      expect(d.datosControlInterno?.noPermisoSanitario).toBe('PS-77');
      expect(d.datosEstablecimiento?.municipioDps).toBe('Santiago (DPS Santiago)');
      expect(d.coordinadorCertificado).toBe('Firma Electrónica Avanzada (Ley 126-02)');
    });
  });

  describe('ExpedientesService.generarPdf', () => {
    const casoBase = (evaluaciones: any[]) => ({
      id: 1n,
      establecimiento: { idEmpresa: 1n, nombre: 'Planta', empresa: { razonSocial: 'ACME SRL', rnc: '131000001' } },
      expediente: { id: 1n, estado: 'Cerrado', resultadoFinal: 'Aprueba', fechaCierre: null },
      origen: null,
      evaluaciones,
    });

    async function generar(caso: any) {
      const prisma = { caso: { findUnique: jest.fn().mockResolvedValue(caso) } };
      const pdfMock = { generarDocumentoPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-')) };
      await new ExpedientesService(prisma as any, pdfMock as any, {} as any, {} as any, {} as any).generarPdf('1', admin);
      return pdfMock.generarDocumentoPdf.mock.calls[0][0] as DocumentoPdfData;
    }

    it('sin evaluación aprobada: sin sello (antes se dibujaba igual) y sin firmantes de ejemplo', async () => {
      const d = await generar(casoBase([]));
      expect(d.incluirSello).toBe(false);
      expect(d.tecnicoNombre).toBeUndefined();
      expect(d.coordinadorNombre).toBeUndefined();
      expect(d.secciones?.[1]?.contenido).toBe('N/A');
    });

    it('con evaluación aprobada pero sin coordinador registrado: sello sí, pero sin nombre inventado', async () => {
      const d = await generar(
        casoBase([{ estado: { codigo: 'APROBADA' }, evaluador: { nombreCompleto: 'Tecnico Real' }, coordinador: null, calculoRiesgo: null, respuestas: [], informe: null }]),
      );
      expect(d.incluirSello).toBe(true);
      expect(d.tecnicoNombre).toBe('Tecnico Real');
      expect(d.coordinadorNombre).toBeUndefined();
    });

    it('con evaluación aprobada y coordinador real: usa su nombre, no "Ing. Carlos Peña" fijo', async () => {
      const d = await generar(
        casoBase([
          { estado: { codigo: 'CERRADA' }, evaluador: { nombreCompleto: 'Tecnico Real' }, coordinador: { nombreCompleto: 'Coordinadora Real' }, calculoRiesgo: null, respuestas: [], informe: null },
        ]),
      );
      expect(d.coordinadorNombre).toBe('Coordinadora Real');
    });
  });
});

describe('PDF: bloque de firma del coordinador (ficha oficial y documento genérico)', () => {
  const pdf = new PdfService();
  const ficha = (extra: Partial<DocumentoPdfData> = {}): DocumentoPdfData => ({
    titulo: 'FICHA DE INSPECCIÓN BPM (OFICIAL)', codigo: 'F-1', metadata: [], secciones: [], incluirFirma: true, ...extra,
  });

  it('sin coordinador: no dice "FIRMADO DIGITALMENTE" ni pone un certificado, y el nombre es N/A', async () => {
    const texto = textoDelPdf(await pdf.generarDocumentoPdf(ficha()));
    expect(texto).not.toContain('FIRMADO DIGITALMENTE');
    expect(texto).not.toContain('Cert: MSP-DIGEMAPS-2026');
    expect(texto).not.toContain('Firma Electrónica Avanzada');
    expect(texto).toContain('PENDIENTE DE FIRMA');
  });

  it('con coordinador real: sí firma digitalmente y con su nombre', async () => {
    const texto = textoDelPdf(await pdf.generarDocumentoPdf(ficha({ coordinadorNombre: 'Coordinadora Real' })));
    expect(texto).toContain('FIRMADO DIGITALMENTE');
    expect(texto).toContain('Cert: MSP-DIGEMAPS-2026');
    expect(texto).toContain('Firma Electrónica Avanzada');
    expect(texto).toContain('Coordinadora Real');
  });

  it('sin técnico: N/A, no "Lic. Roberto Morales"', async () => {
    const texto = textoDelPdf(await pdf.generarDocumentoPdf(ficha()));
    expect(texto).not.toContain('Roberto Morales');
  });

  it('documento genérico sin técnico: N/A, no "Lic. Roberto Morales"', async () => {
    const texto = textoDelPdf(
      await pdf.generarDocumentoPdf({
        titulo: 'EXPEDIENTE', metadata: [], secciones: [{ titulo: 'Dictamen', contenido: 'Aprobado.' }], incluirFirma: true,
      }),
    );
    expect(texto).not.toContain('Roberto Morales');
    expect(texto).toContain('N/A');
  });
});
