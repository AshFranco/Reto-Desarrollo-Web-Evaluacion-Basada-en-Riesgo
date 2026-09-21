import PDFDocument from 'pdfkit';
import { PdfService, DocumentoPdfData } from '../src/common/services/pdf.service';

/**
 * Detalles de maquetación del PDF: páginas reales (sin páginas en blanco por el pie), veredicto sin encimarse,
 * sello con todo su texto dentro del círculo y secciones más altas que una página.
 */
describe('PDF: páginas, sello y secciones largas', () => {
  const pdf = new PdfService();
  const nuevoDoc = () => new PDFDocument({ size: 'LETTER', margins: { top: 45, bottom: 45, left: 45, right: 45 } });
  const contarPaginas = (buffer: Buffer) => (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  const lineas = (n: number) =>
    Array.from({ length: n }, (_, i) => `Línea de hallazgo número ${i + 1} con suficiente texto para ocupar espacio real en la página.`).join('\n');

  describe('el pie de página no crea páginas en blanco', () => {
    it('un documento corto ocupa exactamente 1 página', async () => {
      const buffer = await pdf.generarDocumentoPdf({
        titulo: 'INFORME CORTO',
        metadata: [{ etiqueta: 'Empresa', valor: 'Planta X' }],
        secciones: [{ titulo: 'Resumen', contenido: 'Todo en orden.' }],
      });
      expect(contarPaginas(buffer)).toBe(1);
    });

    it('un documento con firmas, QR y sello ocupa solo las páginas de su contenido', async () => {
      const buffer = await pdf.generarDocumentoPdf({
        titulo: 'EXPEDIENTE',
        codigo: 'EXP-0001',
        metadata: [{ etiqueta: 'Empresa', valor: 'Planta X' }],
        secciones: [{ titulo: 'Dictamen', contenido: 'Aprobado.' }],
        incluirSello: true,
        incluirQr: true,
        qrUrl: 'https://sinec.example/verificar/EXP-0001',
        incluirFirma: true,
        tecnicoNombre: 'Ana Pérez',
        coordinadorNombre: 'Carlos Peña',
      });
      expect(contarPaginas(buffer)).toBe(1);
    });

    it('un documento de varias secciones tiene tantas páginas como su contenido necesita', async () => {
      const buffer = await pdf.generarDocumentoPdf({
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

    it('la ficha oficial ocupa 1 página', async () => {
      const buffer = await pdf.generarDocumentoPdf({ titulo: 'FICHA DE INSPECCIÓN BPM (OFICIAL)', codigo: 'F-1', metadata: [], secciones: [] });
      expect(contarPaginas(buffer)).toBe(1);
    });
  });

  describe('caja de resultado del documento genérico', () => {
    const casos = [
      { aprueba: false, frecuencia: 'TRIMESTRAL' },
      { aprueba: true, frecuencia: 'SEMESTRAL' },
      { aprueba: false, frecuencia: undefined },
    ];
    it.each(casos)('el desglose no invade el veredicto (aprueba=$aprueba, frecuencia=$frecuencia)', ({ aprueba, frecuencia }) => {
      const c = (pdf as any).calcularColumnasResultado(nuevoDoc(), 45, 522, {
        cumplimientoPct: 61.4, ncCriticas: 1, ncMayores: 2, ncMenores: 3, nivelRiesgo: 'ALTO', frecuencia, aprueba,
      });
      expect(c.col2X + c.col2Ancho).toBeLessThanOrEqual(c.veredictoX - 8);
      expect(c.col2Ancho).toBeGreaterThan(100);
    });

    it('un documento genérico con resultado se genera en 1 página', async () => {
      const buffer = await pdf.generarDocumentoPdf({
        titulo: 'EXPEDIENTE',
        metadata: [],
        secciones: [{ titulo: 'Dictamen', contenido: 'Aprobado.' }],
        resultado: { cumplimientoPct: 61.4, ncCriticas: 1, ncMayores: 2, ncMenores: 3, nivelRiesgo: 'ALTO', frecuencia: 'TRIMESTRAL', aprueba: false },
      } as DocumentoPdfData);
      expect(contarPaginas(buffer)).toBe(1);
    });
  });

  describe('sello de certificación', () => {
    const r = 36;
    const estados = ['aprobado', 'observado', 'pendiente'] as const;

    it.each(estados)('estado %s: todo el texto cabe dentro del círculo interior y es legible', (estado) => {
      const { filas } = (pdf as any).calcularFilasSello(nuevoDoc(), r, '21 SEPT DE 2026', estado);
      const radioInterior = r - 6;
      for (const fila of filas) {
        const cuerdaMaxima = 2 * Math.sqrt(Math.max(0, radioInterior ** 2 - (Math.abs(fila.dy) + fila.tamano * 0.6) ** 2));
        expect({ texto: fila.texto, cabe: fila.ancho <= cuerdaMaxima + 0.01 }).toEqual({ texto: fila.texto, cabe: true });
        expect(fila.tamano).toBeGreaterThanOrEqual(3.8);
      }
    });

    it.each(estados)('estado %s: ninguna línea divisoria cruza el texto', (estado) => {
      const { filas, divisores } = (pdf as any).calcularFilasSello(nuevoDoc(), r, '21 SEPT DE 2026', estado);
      for (const fila of filas) {
        for (const d of divisores) expect(Math.abs(fila.dy - d)).toBeGreaterThan(fila.tamano * 0.6);
      }
    });

    it('cada estado dice lo que corresponde', () => {
      const textos = (estado: string) =>
        (pdf as any).calcularFilasSello(nuevoDoc(), r, '21 SEPT DE 2026', estado).filas.map((f: any) => f.texto);
      expect(textos('aprobado')).toEqual(expect.arrayContaining(['REPÚBLICA', 'DOMINICANA', 'APROBADO Y', 'VALIDADO', '21 SEPT DE 2026', 'SINEC · DIGEMAPS']));
      expect(textos('observado')).toEqual(expect.arrayContaining(['NO APROBADO', 'OBSERVADO']));
      expect(textos('observado')).not.toContain('VALIDADO');
      expect(textos('pendiente')).toEqual(expect.arrayContaining(['SIN VALIDAR']));
      expect(textos('pendiente')).not.toContain('VALIDADO');
    });
  });

  describe('sección más alta que una página', () => {
    it('se parte entre páginas: 80 líneas ocupan 2 páginas reales, sin caja desbordada', async () => {
      const buffer = await pdf.generarDocumentoPdf({
        titulo: 'INFORME LARGO',
        metadata: [{ etiqueta: 'Empresa', valor: 'Planta X' }],
        secciones: [{ titulo: 'Hallazgos', contenido: lineas(80) }],
      });
      expect(contarPaginas(buffer)).toBe(2);
    });

    it('no pierde ni duplica texto al partirla y cada trozo cabe en su altura', () => {
      const doc = nuevoDoc();
      doc.font('Helvetica').fontSize(9.5);
      const texto = lineas(80);
      const altos = [300, 650, 650];
      const trozos: string[] = (pdf as any).partirTextoPorAltura(doc, texto, 502, altos);
      expect(trozos.length).toBeGreaterThan(1);
      expect(trozos.join(' ').replace(/\s+/g, ' ').trim()).toBe(texto.replace(/\s+/g, ' ').trim());
      trozos.forEach((t, i) => {
        expect(doc.heightOfString(t, { width: 502 })).toBeLessThanOrEqual(altos[Math.min(i, altos.length - 1)]);
      });
    });

    it('una sola palabra enorme no provoca un bucle infinito', () => {
      const doc = nuevoDoc();
      doc.font('Helvetica').fontSize(9.5);
      const trozos: string[] = (pdf as any).partirTextoPorAltura(doc, 'x'.repeat(5000), 502, [40, 40]);
      expect(trozos.join('')).toBe('x'.repeat(5000));
    });
  });
});
