import PDFDocument from 'pdfkit';
import { inflateSync } from 'zlib';
import { PdfService, DocumentoPdfData } from '../src/common/services/pdf.service';

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
 * Detalles de maquetación del PDF, sobre el generador actual (el de Rowlis + los datos reales de #71):
 * páginas reales (sin páginas en blanco por el pie), veredicto sin encimarse, sello con todo su texto
 * dentro del círculo y reflejando el estado real (incluido el genérico, que antes decía "APROBADO Y
 * VALIDADO" siempre), y secciones más altas que una página.
 */
describe('PDF: páginas, sello y secciones largas', () => {
  const pdf = new PdfService();
  const nuevoDoc = () => new PDFDocument({ size: 'LETTER', margins: { top: 45, bottom: 45, left: 45, right: 45 } });
  const contarPaginas = (buffer: Buffer) => (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  const lineas = (n: number) =>
    Array.from({ length: n }, (_, i) => `Línea de hallazgo número ${i + 1} con suficiente texto para ocupar espacio real en la página.`).join('\n');

  describe('el pie de página no crea páginas en blanco (documento genérico)', () => {
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
        resultado: { cumplimientoPct: 90, ncCriticas: 0, ncMayores: 0, ncMenores: 0, nivelRiesgo: 'BAJO', aprueba: true },
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

    it('la ficha oficial (con firmas y sello) ocupa 1 página', async () => {
      const buffer = await pdf.generarDocumentoPdf({
        titulo: 'FICHA DE INSPECCIÓN BPM (OFICIAL)', codigo: 'F-1', metadata: [], secciones: [],
        resultado: { cumplimientoPct: 61, ncCriticas: 1, ncMayores: 1, ncMenores: 1, nivelRiesgo: 'ALTO', aprueba: false },
        incluirQr: true, incluirFirma: true, tecnicoNombre: 'Ana', coordinadorNombre: 'Carlos',
      });
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
  });

  describe('sello de certificación (calcularFilasSello: mide con la fuente real)', () => {
    const estados = ['aprobado', 'observado', 'pendiente'] as const;
    const radios = [36, 30];

    for (const r of radios) {
      describe(`radio ${r} (ficha oficial / documento genérico)`, () => {
        it.each(estados)('estado %s: todo el texto cabe dentro del círculo interior', (estado) => {
          const { filas } = (pdf as any).calcularFilasSello(nuevoDoc(), r, '21 SEPT DE 2026', estado, 'SINEC · DIGEMAPS');
          const radioInterior = r - 6;
          for (const fila of filas) {
            const cuerdaMaxima = 2 * Math.sqrt(Math.max(0, radioInterior ** 2 - (Math.abs(fila.dy) + fila.tamano * 0.6) ** 2));
            expect({ texto: fila.texto, cabe: fila.ancho <= cuerdaMaxima + 0.01 }).toEqual({ texto: fila.texto, cabe: true });
            // El tamaño mínimo se escala junto con el radio (3.65 pt a r=36).
            expect(fila.tamano).toBeGreaterThanOrEqual(3.6 * (r / 36) - 0.01);
          }
        });

        it.each(estados)('estado %s: ninguna línea divisoria cruza el texto', (estado) => {
          const { filas, divisores } = (pdf as any).calcularFilasSello(nuevoDoc(), r, '21 SEPT DE 2026', estado, 'SINEC · DIGEMAPS');
          for (const fila of filas) {
            for (const d of divisores) expect(Math.abs(fila.dy - d)).toBeGreaterThan(fila.tamano * 0.6);
          }
        });
      });
    }

    it('cada estado dice lo que corresponde (repartido en 2 renglones)', () => {
      const textos = (estado: string) => (pdf as any).calcularFilasSello(nuevoDoc(), 36, '21 SEPT DE 2026', estado, 'SINEC · DIGEMAPS').filas.map((f: any) => f.texto).join(' ');
      expect(textos('aprobado')).toContain('APROBADO Y VALIDADO');
      expect(textos('observado')).toContain('NO APROBADO OBSERVADO');
      expect(textos('observado')).not.toContain('APROBADO Y VALIDADO');
      expect(textos('pendiente')).toContain('PENDIENTE DE DICTAMEN');
    });
  });

  describe('el sello del documento genérico refleja el resultado real (antes decía "APROBADO Y VALIDADO" siempre)', () => {
    const doc = (resultado?: DocumentoPdfData['resultado']) =>
      pdf.generarDocumentoPdf({
        titulo: 'EXPEDIENTE', metadata: [], secciones: [{ titulo: 'Dictamen', contenido: 'x' }],
        resultado, incluirSello: true, coordinadorNombre: 'Coordinadora Real',
      });

    it('resultado desfavorable: el sello dice "NO APROBADO / OBSERVADO", no "APROBADO Y VALIDADO"', async () => {
      // Los dos renglones del estado se dibujan por separado (sin espacio entre ellos al extraer el texto).
      const texto = textoDelPdf(await doc({ cumplimientoPct: 40, ncCriticas: 2, ncMayores: 0, ncMenores: 0, nivelRiesgo: 'ALTO', aprueba: false }));
      expect(texto).toContain('NO APROBADOOBSERVADO');
      expect(texto).not.toContain('APROBADO YVALIDADO');
    });

    it('resultado favorable: sí dice "APROBADO Y VALIDADO"', async () => {
      const texto = textoDelPdf(await doc({ cumplimientoPct: 90, ncCriticas: 0, ncMayores: 0, ncMenores: 0, nivelRiesgo: 'BAJO', aprueba: true }));
      expect(texto).toContain('APROBADO YVALIDADO');
    });

    it('sin coordinador: no hay sello ni "FIRMADO DIGITALMENTE", aunque incluirSello sea true', async () => {
      const texto = textoDelPdf(
        await pdf.generarDocumentoPdf({
          titulo: 'EXPEDIENTE', metadata: [], secciones: [{ titulo: 'Dictamen', contenido: 'x' }],
          resultado: { cumplimientoPct: 90, ncCriticas: 0, ncMayores: 0, ncMenores: 0, nivelRiesgo: 'BAJO', aprueba: true },
          incluirSello: true,
        }),
      );
      expect(texto).not.toContain('FIRMADO DIGITALMENTE');
      expect(texto).not.toContain('APROBADO Y VALIDADO');
      expect(texto).toContain('PENDIENTE DE FIRMA');
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
