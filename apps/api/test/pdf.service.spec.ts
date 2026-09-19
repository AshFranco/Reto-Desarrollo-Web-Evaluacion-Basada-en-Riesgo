import { PdfService, DocumentoPdfData } from '../src/common/services/pdf.service';

describe('PdfService', () => {
  let pdfService: PdfService;

  beforeEach(() => {
    pdfService = new PdfService();
  });

  it('se inicializa correctamente como servicio inyectable', () => {
    expect(pdfService).toBeDefined();
  });

  it('genera un Buffer que es un PDF válido (encabezado %PDF y tamaño razonable)', async () => {
    const doc: DocumentoPdfData = {
      titulo: 'INFORME DE EVALUACIÓN BASADA EN RIESGO',
      subtitulo: 'Establecimiento: Planta de Prueba SRL',
      codigo: 'EBR-000123',
      version: '2024-10-Rev-FSP-FD',
      metadata: [
        { etiqueta: 'ID Evaluacion', valor: '123' },
        { etiqueta: 'Evaluador', valor: 'Ana Pérez' },
        { etiqueta: 'Empresa', valor: 'Planta de Prueba SRL' },
        { etiqueta: 'RNC Empresa', valor: '130000001' },
      ],
      secciones: [
        { titulo: 'Resumen Ejecutivo', contenido: 'Todo en orden, cumplimiento satisfactorio.' },
        { titulo: 'Hallazgos', contenido: '' },
      ],
    };

    const buffer = await pdfService.generarDocumentoPdf(doc);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
    // El trailer real de PDF debe estar presente al final del stream.
    expect(buffer.subarray(-20).toString('latin1')).toContain('%%EOF');
  });

  it('no lanza excepción cuando metadata y secciones vienen vacías (estado vacío elegante)', async () => {
    const doc: DocumentoPdfData = {
      titulo: 'ACTA SIN DATOS',
      metadata: [],
      secciones: [{ titulo: 'Observaciones', contenido: '' }],
    };

    await expect(pdfService.generarDocumentoPdf(doc)).resolves.toBeInstanceOf(Buffer);
  });

  it('renderiza la caja de resultado destacado y la tabla de no conformidades cuando se proveen', async () => {
    const doc: DocumentoPdfData = {
      titulo: 'INFORME CON RESULTADO',
      metadata: [{ etiqueta: 'Empresa', valor: 'Planta X' }],
      resultado: {
        cumplimientoPct: 87.5,
        ncCriticas: 0,
        ncMayores: 1,
        ncMenores: 3,
        nivelRiesgo: 'BAJO',
        frecuencia: 'ANUAL',
        aprueba: true,
      },
      noConformidades: [
        { item: 'Control de temperatura', gravedad: 'MAYOR', calificacion: 'CP', observacion: 'Falta bitácora.' },
        { item: 'Higiene del personal', gravedad: 'MENOR', calificacion: 'CP', observacion: 'Uniforme incompleto.' },
      ],
      secciones: [],
    };

    const buffer = await pdfService.generarDocumentoPdf(doc);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('produce múltiples páginas cuando el contenido de las secciones es largo (paginación real, no truncado en silencio)', async () => {
    const contenidoLargo = Array.from({ length: 80 }, (_, i) => `Línea de hallazgo número ${i + 1} con suficiente texto para ocupar espacio real en la página.`).join('\n');

    const doc: DocumentoPdfData = {
      titulo: 'INFORME LARGO',
      metadata: [],
      secciones: [
        { titulo: 'Hallazgos extensos', contenido: contenidoLargo },
        { titulo: 'Recomendaciones extensas', contenido: contenidoLargo },
      ],
    };

    const buffer = await pdfService.generarDocumentoPdf(doc);
    const texto = buffer.toString('latin1');
    // Cada página real trae su propio objeto /Type /Page en el PDF.
    const cantidadPaginas = (texto.match(/\/Type\s*\/Page[^s]/g) || []).length;
    expect(cantidadPaginas).toBeGreaterThan(1);
  });
});
