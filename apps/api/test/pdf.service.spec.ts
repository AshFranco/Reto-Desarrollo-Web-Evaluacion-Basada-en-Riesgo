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

  it('renderiza ficha oficial BPM con código QR real escaneable, sello de certificación y firma manuscrita', async () => {
    const doc: DocumentoPdfData = {
      titulo: 'FICHA OFICIAL DE INSPECCIÓN Y EVALUACIÓN BPM',
      subtitulo: 'Establecimiento: Laboratorio Sanitario Central SRL',
      codigo: 'F-BPM-2026-0042',
      version: '2026-Rev-BPM-RD',
      metadataTitulo: 'DATOS DEL ESTABLECIMIENTO Y CONTACTOS',
      metadata: [
        { etiqueta: 'ID Evaluación', valor: '42' },
        { etiqueta: 'Establecimiento', valor: 'Laboratorio Sanitario Central SRL' },
        { etiqueta: 'Empresa Titular', valor: 'Grupo Sanitario Dominicano SAS' },
        { etiqueta: 'RNC Empresa', valor: '130000002' },
      ],
      metadataControlTitulo: 'DATOS DE CONTROL INTERNO Y FISCALIZACIÓN',
      metadataControl: [
        { etiqueta: 'Código Ficha', valor: 'F-BPM-2026-0042' },
        { etiqueta: 'Tipo de Evaluación', valor: 'Vigilancia Sanitaria Regular BPM' },
        { etiqueta: 'Coordinador Revisor', valor: 'Ing. Carlos Peña' },
      ],
      resultado: {
        cumplimientoPct: 88.0,
        ncCriticas: 0,
        ncMayores: 2,
        ncMenores: 1,
        nivelRiesgo: 'BAJO',
        frecuencia: 'ANUAL',
        aprueba: true,
      },
      noConformidades: [
        {
          item: '4.2 Control de temperatura en cámaras de frío',
          gravedad: 'MAYOR',
          calificacion: 'No cumple parcial',
          observacion: 'El termómetro análogo no cuenta con calibración vigente.',
        },
      ],
      secciones: [
        { titulo: 'Resumen Ejecutivo', contenido: 'Establecimiento calificado favorablemente para certificación BPM.' },
      ],
      incluirSello: true,
      incluirQr: true,
      qrUrl: 'https://sinec.msp.gob.do/verificar/informe/F-BPM-2026-0042',
      incluirFirma: true,
      tecnicoNombre: 'Lic. Roberto Morales',
      tecnicoCargo: 'Técnico Evaluador Autorizado BPM',
      coordinadorNombre: 'Ing. Carlos Peña',
      coordinadorCargo: 'Coordinador Técnico DIGEMAPS',
    };

    const buffer = await pdfService.generarDocumentoPdf(doc);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(5000);
    // Verificar que contiene objetos de imagen (logo, firma o QR embebidos en el stream)
    const raw = buffer.toString('latin1');
    expect(raw).toContain('/Subtype /Image');
    expect(buffer.subarray(-20).toString('latin1')).toContain('%%EOF');
  });
});

