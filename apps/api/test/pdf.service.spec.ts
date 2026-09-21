import PDFDocument from 'pdfkit';
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

  describe('páginas del documento (el pie de página no debe crear páginas en blanco)', () => {
    const contarPaginas = (buffer: Buffer) => (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    const lineas = (n: number) =>
      Array.from({ length: n }, (_, i) => `Línea de hallazgo número ${i + 1} con suficiente texto para ocupar espacio real en la página.`).join('\n');

    it('un documento corto ocupa exactamente 1 página', async () => {
      const buffer = await pdfService.generarDocumentoPdf({
        titulo: 'INFORME CORTO',
        metadata: [{ etiqueta: 'Empresa', valor: 'Planta X' }],
        secciones: [{ titulo: 'Resumen', contenido: 'Todo en orden.' }],
      });
      expect(contarPaginas(buffer)).toBe(1);
    });

    it('un documento vacío ocupa exactamente 1 página', async () => {
      const buffer = await pdfService.generarDocumentoPdf({ titulo: 'VACÍO', metadata: [], secciones: [] });
      expect(contarPaginas(buffer)).toBe(1);
    });

    it('un documento con firmas, QR y sello ocupa solo las páginas de su contenido', async () => {
      const buffer = await pdfService.generarDocumentoPdf({
        titulo: 'EXPEDIENTE',
        codigo: 'EXP-0001',
        metadata: [{ etiqueta: 'Empresa', valor: 'Planta X' }],
        secciones: [{ titulo: 'Dictamen', contenido: 'Aprobado.' }],
        incluirSello: true,
        incluirQr: true,
        qrUrl: 'https://sinec.example/verificar/EXP-0001',
        incluirFirma: true,
        tecnicoNombre: 'Ana Pérez',
        tecnicoCargo: 'Técnico Evaluador',
        coordinadorNombre: 'Carlos Peña',
        coordinadorCargo: 'Coordinador Técnico',
      });
      expect(contarPaginas(buffer)).toBe(1);
    });

    it('un documento de varias secciones tiene tantas páginas como su contenido necesita, sin sumarle páginas de pie', async () => {
      const buffer = await pdfService.generarDocumentoPdf({
        titulo: 'INFORME MEDIANO',
        metadata: [{ etiqueta: 'Empresa', valor: 'Planta X' }],
        secciones: [
          { titulo: 'Hallazgos', contenido: lineas(25) },
          { titulo: 'No conformidades', contenido: lineas(25) },
          { titulo: 'Recomendaciones', contenido: lineas(25) },
        ],
      });
      // Contenido real en 2 páginas; con el defecto salían 6 (2 en blanco por cada página real).
      expect(contarPaginas(buffer)).toBe(2);
    });
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

  describe('detalles visuales del documento', () => {
    const nuevoDoc = () => new PDFDocument({ size: 'LETTER', margins: { top: 45, bottom: 45, left: 45, right: 45 } });
    const contarPaginas = (buffer: Buffer) => (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    const lineas = (n: number) =>
      Array.from({ length: n }, (_, i) => `Línea de hallazgo número ${i + 1} con suficiente texto para ocupar espacio real en la página.`).join('\n');

    describe('caja de resultado', () => {
      const casos = [
        { aprueba: false, frecuencia: 'TRIMESTRAL' },
        { aprueba: true, frecuencia: 'SEMESTRAL' },
        { aprueba: false, frecuencia: undefined },
      ];
      it.each(casos)('el desglose no invade el veredicto (aprueba=$aprueba, frecuencia=$frecuencia)', ({ aprueba, frecuencia }) => {
        const c = (pdfService as any).calcularColumnasResultado(nuevoDoc(), 45, 522, {
          cumplimientoPct: 61.4, ncCriticas: 1, ncMayores: 2, ncMenores: 3, nivelRiesgo: 'ALTO', frecuencia, aprueba,
        });
        expect(c.col2X + c.col2Ancho).toBeLessThanOrEqual(c.veredictoX - 8);
        expect(c.col2Ancho).toBeGreaterThan(100);
      });
    });

    describe('sello de certificación', () => {
      const r = 36;
      const sello = () => (pdfService as any).calcularFilasSello(nuevoDoc(), r, '21 SEPT DE 2026');

      it('todo el texto cabe dentro del círculo interior, sin tocar el borde', () => {
        const { filas } = sello();
        const radioInterior = r - 6;
        for (const fila of filas) {
          const mitadAlto = fila.tamano * 0.6;
          const cuerdaMaxima = 2 * Math.sqrt(Math.max(0, radioInterior ** 2 - (Math.abs(fila.dy) + mitadAlto) ** 2));
          expect({ texto: fila.texto, cabe: fila.ancho <= cuerdaMaxima + 0.01 }).toEqual({ texto: fila.texto, cabe: true });
        }
      });

      it('ningún texto queda cruzado por una línea divisoria y todos son legibles', () => {
        const { filas, divisores } = sello();
        for (const fila of filas) {
          expect(fila.tamano).toBeGreaterThanOrEqual(3.8);
          for (const d of divisores) expect(Math.abs(fila.dy - d)).toBeGreaterThan(fila.tamano * 0.6);
        }
      });

      it('conserva los textos institucionales', () => {
        const { filas } = sello();
        const textos = filas.map((f: any) => f.texto).join(' ');
        for (const t of ['REPÚBLICA', 'DOMINICANA', 'APROBADO Y', 'VALIDADO', '21 SEPT DE 2026', 'SINEC · DIGEMAPS']) {
          expect(textos).toContain(t);
        }
      });
    });

    describe('sección más alta que una página', () => {
      it('se parte entre páginas: 80 líneas ocupan 2 páginas reales, sin caja desbordada', async () => {
        const buffer = await pdfService.generarDocumentoPdf({
          titulo: 'INFORME LARGO',
          metadata: [],
          secciones: [{ titulo: 'Hallazgos', contenido: lineas(80) }],
        });
        expect(contarPaginas(buffer)).toBe(2);
      });

      it('no pierde ni duplica texto al partirla', () => {
        const doc = nuevoDoc();
        doc.font('Helvetica').fontSize(9.5);
        const texto = lineas(80);
        const trozos: string[] = (pdfService as any).partirTextoPorAltura(doc, texto, 502, [300, 650, 650]);
        expect(trozos.length).toBeGreaterThan(1);
        expect(trozos.join(' ').replace(/\s+/g, ' ').trim()).toBe(texto.replace(/\s+/g, ' ').trim());
        trozos.forEach((t, i) => {
          const limite = [300, 650, 650][Math.min(i, 2)];
          expect(doc.heightOfString(t, { width: 502 })).toBeLessThanOrEqual(limite);
        });
      });

      it('una sola palabra enorme no provoca un bucle infinito', () => {
        const doc = nuevoDoc();
        doc.font('Helvetica').fontSize(9.5);
        const trozos: string[] = (pdfService as any).partirTextoPorAltura(doc, 'x'.repeat(5000), 502, [40, 40]);
        expect(trozos.join('')).toBe('x'.repeat(5000));
      });
    });
  });

});

