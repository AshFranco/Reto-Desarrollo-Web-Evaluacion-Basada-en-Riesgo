import { inflateSync } from 'zlib';
import { PdfService, DocumentoPdfData } from '../src/common/services/pdf.service';
import { InformesService } from '../src/modules/informes/informes.service';
import { ExpedientesService } from '../src/modules/expedientes/expedientes.service';
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

const INVENTADOS = [
  'Ashley Franco',
  'Restaurante Franciscano',
  'Av. Duarte',
  'Santo Domingo Este',
  '555-0199',
  'Roberto Morales',
  'Carlos Peña',
  'PS-SAN-2026',
  'BAJO (0.42)',
  '88%',
  '8f9b2d4c8c6a',
];

describe('PDF: nunca se inventan datos (N/A cuando no hay dato real)', () => {
  const pdf = new PdfService();

  const fichaSinDatos = (extra: Partial<DocumentoPdfData> = {}): DocumentoPdfData => ({
    titulo: 'FICHA DE INSPECCIÓN BPM (OFICIAL)',
    codigo: 'F-BPM-2026-0001',
    metadata: [],
    secciones: [],
    incluirQr: true,
    qrUrl: 'https://sinec.example/verificar/1',
    incluirFirma: true,
    incluirSello: true,
    ...extra,
  });

  describe('ficha oficial sin resultado ni datos', () => {
    let texto: string;
    beforeAll(async () => {
      texto = textoDelPdf(await pdf.generarDocumentoPdf(fichaSinDatos()));
    });

    it.each(INVENTADOS)('no muestra el valor de ejemplo "%s"', (inventado) => {
      expect(texto).not.toContain(inventado);
    });

    it('no afirma aprobación ni dictamen favorable', () => {
      expect(texto).not.toContain('PERMISO SANITARIO APROBADO');
      expect(texto).not.toContain('APROBADO YVALIDADO');
      expect(texto).not.toContain('Favorable');
      expect(texto).not.toContain('Desfavorable');
    });

    it('muestra el estado real: sin resultado, sin validar y pendiente de firma', () => {
      expect(texto).toContain('RESULTADO PENDIENTE');
      expect(texto).toContain('Sin resultado de evaluación registrado.');
      expect(texto).toContain('SIN VALIDAR');
      expect(texto).toContain('PENDIENTE DE FIRMA');
      expect(texto).not.toContain('FIRMADO DIGITALMENTE');
    });

    it('no afirma que el establecimiento cumple cuando no hay resultados', () => {
      expect(texto).not.toContain('cumple satisfactoriamente');
      expect(texto).toContain('Sin resultados de evaluación registrados');
    });

    it('rellena los campos vacíos con N/A', () => {
      expect((texto.match(/N\/A/g) ?? []).length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('ficha oficial con resultado real', () => {
    const resultado = (aprueba: boolean) => ({
      cumplimientoPct: 76.4, ncCriticas: 1, ncMayores: 2, ncMenores: 3, nivelRiesgo: 'ALTO', frecuencia: 'TRIMESTRAL', aprueba,
    });

    it('aprobada: muestra el porcentaje real, el permiso aprobado y el sello', async () => {
      const texto = textoDelPdf(await pdf.generarDocumentoPdf(fichaSinDatos({ resultado: resultado(true), coordinadorNombre: 'Ana Coord' })));
      expect(texto).toContain('76%');
      expect(texto).toContain('cumple satisfactoriamente');
      expect(texto).toContain('PERMISO SANITARIO APROBADO');
      expect(texto).toContain('APROBADO YVALIDADO');
      expect(texto).toContain('Favorable');
      expect(texto).toContain('FIRMADO DIGITALMENTE');
      expect(texto).not.toContain('88%');
    });

    it('no aprobada: lo dice y no usa el sello de aprobación', async () => {
      const texto = textoDelPdf(await pdf.generarDocumentoPdf(fichaSinDatos({ resultado: resultado(false) })));
      expect(texto).toContain('PERMISO SANITARIO NO APROBADO');
      expect(texto).toContain('NO APROBADOOBSERVADO');
      expect(texto).toContain('Desfavorable');
      expect(texto).not.toContain('APROBADO YVALIDADO');
    });
  });

  describe('hash de integridad', () => {
    const hashDe = (t: string) => t.match(/contenido del documento\): ([0-9a-f]{64})/)?.[1];

    it('es un SHA-256 real del contenido: estable con los mismos datos y distinto si cambian', async () => {
      const a = hashDe(textoDelPdf(await pdf.generarDocumentoPdf(fichaSinDatos())));
      const b = hashDe(textoDelPdf(await pdf.generarDocumentoPdf(fichaSinDatos())));
      const c = hashDe(textoDelPdf(await pdf.generarDocumentoPdf(fichaSinDatos({ codigo: 'F-BPM-2026-0002' }))));
      expect(a).toMatch(/^[0-9a-f]{64}$/);
      expect(a).toBe(b);
      expect(a).not.toBe(c);
      expect(a).not.toBe('8f9b2d4c8c6a1f8b3c5e7d9a2f4b6c8e0a1b3d5f7a9c2c4b6d8f0a2c4c6b8d0a');
    });
  });

  describe('documento genérico (expediente) sin firmantes', () => {
    it('no pone nombres de personas de ejemplo', async () => {
      const texto = textoDelPdf(
        await pdf.generarDocumentoPdf({
          titulo: 'EXPEDIENTE Y DICTAMEN',
          metadata: [{ etiqueta: 'ID', valor: '1' }],
          secciones: [{ titulo: 'Dictamen', contenido: 'Aprobado.' }],
          incluirFirma: true,
          incluirSello: false,
          incluirQr: true,
          qrUrl: 'https://sinec.example/v/1',
        }),
      );
      expect(texto).not.toContain('Roberto Morales');
      expect(texto).not.toContain('Carlos Peña');
      expect(texto).toContain('N/A');
      expect(texto).not.toContain('TEC-BPM-RD');
      expect(texto).not.toContain('FIRMADO DIGITALMENTE');
      expect(texto).toContain('PENDIENTE DE FIRMA');
    });
  });
});

describe('Servicios de informes y expedientes: armado de datos sin inventar', () => {
  const admin = { sub: '1', rol: 'ADMINISTRADOR', empresaId: null } as JwtPayload;

  describe('InformesService.generarPdf', () => {
    const evaluacionMinima = (extra: any = {}) => ({
      id: 5n,
      fechaProgramada: null,
      fechaInicio: null,
      fechaFinalizacion: null,
      fechaRevision: null,
      evaluador: null,
      coordinador: null,
      estado: { codigo: 'PROGRAMADA', nombre: 'Programada' },
      versionFicha: { numeroVersion: '2024', estado: 'Activa' },
      caso: null,
      informe: null,
      calculoRiesgo: null,
      respuestas: [],
      establecimiento: { id: 9n, idEmpresa: 1n, nombre: 'Planta', contactos: [], empresa: { razonSocial: 'ACME SRL', rnc: '131000001', contactos: [] } },
      ...extra,
    });

    async function generar(evaluacion: any) {
      const prisma = { evaluacion: { findUnique: jest.fn().mockResolvedValue(evaluacion) } };
      const pdfMock = { generarDocumentoPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-')) };
      await new InformesService(prisma as any, pdfMock as any, {} as any, {} as any).generarPdf('5', admin);
      return pdfMock.generarDocumentoPdf.mock.calls[0][0] as DocumentoPdfData;
    }

    it('sin datos reales, cada campo dice N/A y el dictamen no es favorable ni desfavorable', async () => {
      const d = await generar(evaluacionMinima());

      expect(d.datosEstablecimiento).toMatchObject({
        empresaRazonSocial: 'ACME SRL',
        rnc: '131000001',
        direccionFisica: 'N/A',
        municipioDps: 'N/A',
        representanteLegal: 'N/A',
        telefonoContacto: 'N/A',
      });
      expect(d.datosControlInterno).toMatchObject({
        fechaInspeccionInicial: 'N/A',
        fechaInspeccionActual: 'N/A',
        noPermisoSanitario: 'N/A',
        motivoInspeccion: 'N/A',
        tecnicoEvaluador: 'N/A',
        coordinadorRevisor: 'N/A',
        frecuenciaFiscalizacion: 'N/A',
        dictamenTecnico: 'N/A',
      });
      expect(d.datosControlInterno?.esFavorable).toBeUndefined();
      expect(d.resultado).toBeUndefined();
      expect(d.coordinadorNombre).toBeUndefined();
      expect(d.coordinadorCertificado).toBeUndefined();
      expect(JSON.stringify(d)).not.toMatch(/Ashley|Franciscano|Roberto Morales|Carlos Peña|Duarte|555-0199|PS-SAN/);
    });

    it('con datos reales usa los reales', async () => {
      const d = await generar(
        evaluacionMinima({
          evaluador: { id: 7n, nombreCompleto: 'Tecnico Real' },
          coordinador: { id: 3n, nombreCompleto: 'Coordinadora Real' },
          fechaInicio: new Date('2026-09-10T12:00:00Z'),
          caso: { origen: { nombre: 'Solicitud de Empresa' } },
          establecimiento: {
            id: 9n, idEmpresa: 1n, nombre: 'Planta', calle: 'Calle 1 #2', telefono: '8095551111', numeroPermisoSanitario: 'PS-77',
            municipio: { nombre: 'Santiago', provincia: { nombre: 'Santiago' } },
            contactos: [{ nombreCompleto: 'Rep Real', tipoContacto: { codigo: 'REPRESENTANTE' } }],
            empresa: { razonSocial: 'ACME SRL', rnc: '131000001', contactos: [] },
          },
        }),
      );
      expect(d.datosEstablecimiento).toMatchObject({
        direccionFisica: 'Calle 1 #2', representanteLegal: 'Rep Real', telefonoContacto: '8095551111', municipioDps: 'Santiago (DPS Santiago)',
      });
      expect(d.datosControlInterno).toMatchObject({
        tecnicoEvaluador: 'Tecnico Real (TEC-07)', coordinadorRevisor: 'Coordinadora Real (DIGEMAPS)', noPermisoSanitario: 'PS-77', motivoInspeccion: 'Solicitud de Empresa',
      });
      expect(d.coordinadorNombre).toBe('Coordinadora Real');
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
      await new ExpedientesService(prisma as any, pdfMock as any, {} as any).generarPdf('1', admin);
      return pdfMock.generarDocumentoPdf.mock.calls[0][0] as DocumentoPdfData;
    }

    it('sin evaluación aprobada: sin sello, sin firmantes inventados y sin afirmar que se archivó', async () => {
      const d = await generar(casoBase([]));
      expect(d.incluirSello).toBe(false);
      expect(d.tecnicoNombre).toBeUndefined();
      expect(d.coordinadorNombre).toBeUndefined();
      expect(d.secciones?.[1]?.contenido).toBe('N/A');
    });

    it('con evaluación aprobada: sello y firmantes reales', async () => {
      const d = await generar(
        casoBase([
          {
            estado: { codigo: 'APROBADA' },
            evaluador: { nombreCompleto: 'Tecnico Real' },
            coordinador: { nombreCompleto: 'Coordinadora Real' },
            calculoRiesgo: null,
            respuestas: [],
            informe: null,
          },
        ]),
      );
      expect(d.incluirSello).toBe(true);
      expect(d.tecnicoNombre).toBe('Tecnico Real');
      expect(d.coordinadorNombre).toBe('Coordinadora Real');
    });
  });
});
