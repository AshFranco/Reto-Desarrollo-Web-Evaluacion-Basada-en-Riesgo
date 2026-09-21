import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface SeccionPdf {
  titulo: string;
  contenido: string;
}

export interface MetadatoPdf {
  etiqueta: string;
  valor: string;
}

export type GravedadNoConformidad = 'CRITICA' | 'MAYOR' | 'MENOR';

export interface FilaNoConformidad {
  item: string;
  gravedad: GravedadNoConformidad;
  calificacion: string;
  observacion: string;
}

export interface ResultadoDestacadoPdf {
  cumplimientoPct: number;
  ncCriticas: number;
  ncMayores: number;
  ncMenores: number;
  nivelRiesgo: string;
  frecuencia?: string;
  aprueba: boolean;
}

export interface DocumentoPdfData {
  titulo: string;
  subtitulo?: string;
  /** Código de expediente/documento, se muestra junto a la fecha en el encabezado. Opcional. */
  codigo?: string;
  /** Versión del documento/ficha, se muestra junto al código. Opcional. */
  version?: string;
  /**
   * Se mantiene como el arreglo genérico de datos que ya construían
   * informes.service.ts y expedientes.service.ts -- no se les pide que
   * separen establecimiento vs. control interno, así que por defecto
   * sigue rotulándose "DATOS GENERALES" como antes. `metadataTitulo`
   * permite que un caller futuro (no tocado en esta migración) use el
   * rótulo real del diseño nuevo ("Datos del establecimiento y contactos").
   */
  metadata: MetadatoPdf[];
  metadataTitulo?: string;
  /** Segunda grilla opcional -- ej. "Datos de control interno" del diseño nuevo. */
  metadataControl?: MetadatoPdf[];
  metadataControlTitulo?: string;
  /** Caja de resultado destacada (cumplimiento, NC, nivel de riesgo, Aprueba/No aprueba). Opcional. */
  resultado?: ResultadoDestacadoPdf;
  /** Tabla de no conformidades con pill de gravedad. Opcional. */
  noConformidades?: FilaNoConformidad[];
  secciones: SeccionPdf[];
  /** Habilita la inclusión del sello oficial circular de certificación */
  incluirSello?: boolean;
  /** Habilita la generación e inclusión del código QR real */
  incluirQr?: boolean;
  /** URL destino que codificará el código QR escaneable */
  qrUrl?: string;
  /** Habilita la inclusión de la firma digital manuscrita */
  incluirFirma?: boolean;
  /** Nombre del técnico evaluador */
  tecnicoNombre?: string;
  /** Cargo o acreditación del técnico evaluador */
  tecnicoCargo?: string;
  /** Nombre del coordinador técnico revisor */
  coordinadorNombre?: string;
  /** Cargo del coordinador técnico revisor */
  coordinadorCargo?: string;
  /** Fecha textual de emisión del documento (opcional) */
  fechaEmision?: string;
}

const AZUL_INSTITUCIONAL = '#002B49';
const AZUL_OSCURO = '#0F172A';
const GRIS_TEXTO = '#334155';
const GRIS_CLARO = '#64748B';
const FONDO_GRIS = '#F1F5F9';
const BORDE_GRIS = '#CBD5E1';
const VERDE_APRUEBA = '#16A34A';
const ROJO_NO_APRUEBA = '#DC2626';
const ROJO_CRITICA = '#DC2626';
const AMBAR_MAYOR = '#D97706';
const GRIS_MENOR = '#6B7280';

const COLOR_GRAVEDAD: Record<GravedadNoConformidad, string> = {
  CRITICA: ROJO_CRITICA,
  MAYOR: AMBAR_MAYOR,
  MENOR: GRIS_MENOR,
};

const ETIQUETA_GRAVEDAD: Record<GravedadNoConformidad, string> = {
  CRITICA: 'Crítica',
  MAYOR: 'Mayor',
  MENOR: 'Menor',
};

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly margin = 45;

  private rutaLogo(): string | null {
    const candidatos = [
      join(__dirname, '..', '..', 'assets', 'logo-escudo.png'),
      join(__dirname, '..', '..', '..', 'src', 'assets', 'logo-escudo.png'),
    ];
    for (const ruta of candidatos) {
      if (existsSync(ruta)) return ruta;
    }
    return null;
  }

  private rutaFirma(): string | null {
    const candidatos = [
      join(__dirname, '..', '..', 'assets', 'firma.jpg'),
      join(__dirname, '..', '..', '..', 'src', 'assets', 'firma.jpg'),
    ];
    for (const ruta of candidatos) {
      if (existsSync(ruta)) return ruta;
    }
    return null;
  }

  private async generarQrBuffer(url: string): Promise<Buffer | null> {
    try {
      return await QRCode.toBuffer(url, {
        type: 'png',
        margin: 1,
        width: 140,
        color: {
          dark: '#002B49',
          light: '#FFFFFF',
        },
      });
    } catch (err) {
      this.logger.warn(`No se pudo generar el código QR: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  async generarDocumentoPdf(data: DocumentoPdfData): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: this.margin, bottom: this.margin, left: this.margin, right: this.margin },
      bufferPages: true,
    });

    // Generar buffer QR real si se requiere
    let qrBuffer: Buffer | null = null;
    if (data.incluirQr || data.qrUrl) {
      const url =
        data.qrUrl ??
        (data.codigo
          ? `https://sinec.msp.gob.do/verificar/informe/${data.codigo}`
          : 'https://sinec.msp.gob.do');
      qrBuffer = await this.generarQrBuffer(url);
    }

    const chunks: Buffer[] = [];
    const listo = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.dibujarEncabezado(doc, data);

    const tituloMetadata = data.metadataTitulo ?? 'DATOS GENERALES';
    if (data.metadata.length > 0) {
      this.dibujarGrilla(doc, tituloMetadata, data.metadata);
    }

    if (data.metadataControl && data.metadataControl.length > 0) {
      this.dibujarGrilla(doc, data.metadataControlTitulo ?? 'DATOS DE CONTROL INTERNO', data.metadataControl);
    }

    if (data.resultado) {
      this.dibujarResultadoDestacado(doc, data.resultado);
    }

    if (data.noConformidades && data.noConformidades.length > 0) {
      this.dibujarTablaNoConformidades(doc, data.noConformidades);
    }

    for (const seccion of data.secciones) {
      this.dibujarSeccion(doc, seccion);
    }

    if (data.incluirFirma || data.incluirQr || data.qrUrl || data.incluirSello) {
      this.dibujarBloqueFirmasYQr(doc, data, qrBuffer);
    }

    this.dibujarPiePaginaEnTodas(doc);

    doc.end();
    return listo;
  }

  // --- Utilidad de paginación: pdfkit no corta el contenido en silencio
  // como hacía el generador manual (que abandonaba secciones si
  // currentY < 120) -- acá se mide el alto real que va a ocupar el
  // siguiente bloque y, si no cabe en lo que queda de página, se agrega
  // una página nueva ANTES de dibujar, en vez de truncar.
  private asegurarEspacio(doc: PDFKit.PDFDocument, altoNecesario: number) {
    const limiteInferior = doc.page.height - doc.page.margins.bottom;
    if (doc.y + altoNecesario > limiteInferior) {
      doc.addPage();
    }
  }

  private anchoContenido(doc: PDFKit.PDFDocument): number {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  private dibujarEncabezado(doc: PDFKit.PDFDocument, data: DocumentoPdfData) {
    const x = doc.page.margins.left;
    const anchoContenido = this.anchoContenido(doc);
    const yInicio = doc.y;
    const logo = this.rutaLogo();
    const logoTam = 40;
    // Siempre hay un logo dibujado en este espacio -- el real si existe
    // logo-escudo.png, si no un placeholder vectorial (ver dibujarLogoPlaceholder) --
    // así que el texto SIEMPRE arranca desplazado, nunca pegado a x.
    const textoX = x + logoTam + 12;

    if (logo) {
      try {
        doc.image(logo, x, yInicio, { fit: [logoTam, logoTam] });
      } catch (err) {
        this.logger.warn(`No se pudo embeber el logo (${logo}): ${err instanceof Error ? err.message : err}`);
        this.dibujarLogoPlaceholder(doc, x, yInicio, logoTam);
      }
    } else {
      this.dibujarLogoPlaceholder(doc, x, yInicio, logoTam);
    }

    // Título + subtítulo, a la derecha del logo, usando casi todo el ancho
    // disponible -- el bloque de código/versión/fecha va en una fila propia
    // DEBAJO (no a la derecha, en la misma fila) para que nunca compita
    // horizontalmente con el título ni fuerce un wrap que choque con el alto
    // fijo del logo.
    const anchoTitulo = anchoContenido - logoTam - 12;
    doc
      .fillColor(AZUL_OSCURO)
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(data.titulo, textoX, yInicio, { width: anchoTitulo });

    if (data.subtitulo) {
      doc
        .fillColor(GRIS_TEXTO)
        .font('Helvetica')
        .fontSize(10)
        .text(data.subtitulo, textoX, doc.y + 2, { width: anchoTitulo });
    }

    doc.y = Math.max(doc.y, yInicio + logoTam) + 6;

    // Fila propia para código/versión/fecha, alineada a la derecha, debajo
    // del título -- así nunca se superpone con él sin importar cuántas
    // líneas ocupe el título.
    const fecha = new Date().toISOString().split('T')[0];
    const lineasDerecha = [
      data.codigo ? `Código: ${data.codigo}` : null,
      data.version ? `Versión: ${data.version}` : null,
      `Fecha de emisión: ${fecha}`,
    ]
      .filter((l): l is string => !!l)
      .join('   ·   ');

    doc
      .fillColor(GRIS_CLARO)
      .fontSize(8)
      .font('Helvetica')
      .text(lineasDerecha, x, doc.y, { width: anchoContenido, align: 'right' });

    doc.y += 4;
    doc
      .moveTo(x, doc.y)
      .lineTo(x + anchoContenido, doc.y)
      .lineWidth(2)
      .strokeColor(AZUL_INSTITUCIONAL)
      .stroke();
    doc.y += 16;
    doc.x = x;
  }

  /** Placeholder vectorial (escudo simple) usado mientras no exista logo-escudo.png. */
  private dibujarLogoPlaceholder(doc: PDFKit.PDFDocument, x: number, y: number, tam: number) {
    doc.save();
    doc.roundedRect(x, y, tam, tam, 6).fill(AZUL_INSTITUCIONAL);
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('SINEC', x, y + tam / 2 - 6, { width: tam, align: 'center' });
    doc.restore();
  }

  private dibujarGrilla(doc: PDFKit.PDFDocument, titulo: string, items: MetadatoPdf[]) {
    const x = doc.page.margins.left;
    const anchoContenido = this.anchoContenido(doc);
    const filas = Math.ceil(items.length / 2);
    const altoFila = 20;
    const altoCaja = filas * altoFila + 16;

    this.asegurarEspacio(doc, altoCaja + 24);

    doc
      .fillColor(AZUL_INSTITUCIONAL)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(titulo, x, doc.y);
    doc.y += 14;

    const cajaY = doc.y;
    doc.save();
    doc.rect(x, cajaY, anchoContenido, altoCaja).fill(FONDO_GRIS);
    doc.rect(x, cajaY, anchoContenido, altoCaja).lineWidth(1).stroke(BORDE_GRIS);
    doc.restore();

    const colAncho = anchoContenido / 2;
    for (let i = 0; i < items.length; i++) {
      const fila = Math.floor(i / 2);
      const col = i % 2;
      const itemX = x + 10 + col * colAncho;
      const itemY = cajaY + 10 + fila * altoFila;

      doc
        .fillColor(GRIS_TEXTO)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(`${items[i].etiqueta}:`, itemX, itemY, { width: colAncho - 100, continued: false });
      doc
        .fillColor(AZUL_OSCURO)
        .font('Helvetica')
        .fontSize(8.5)
        .text(items[i].valor || 'N/A', itemX + 120, itemY, { width: colAncho - 130 });
    }

    doc.y = cajaY + altoCaja + 20;
    doc.x = x;
  }

  /** Mayor tamaño de letra (hasta `maximo`, sin bajar de `minimo`) con el que `texto` cabe en `ancho`. */
  private tamanoQueCabe(doc: PDFKit.PDFDocument, texto: string, ancho: number, maximo: number, minimo: number): number {
    let tamano = maximo;
    while (tamano > minimo && doc.fontSize(tamano).widthOfString(texto) > ancho) tamano -= 0.25;
    return tamano;
  }

  /**
   * Reparte el ancho de la caja de resultado: el desglose ocupa desde col2X hasta 12 pt antes de donde
   * empieza el veredicto (APRUEBA / NO APRUEBA, alineado a la derecha), medido con la fuente real.
   */
  private calcularColumnasResultado(doc: PDFKit.PDFDocument, x: number, anchoContenido: number, resultado: ResultadoDestacadoPdf) {
    const col2X = x + 190;
    const col3Ancho = 140;
    const col3X = x + anchoContenido - col3Ancho - 15;
    const textoVeredicto = resultado.aprueba ? 'APRUEBA' : 'NO APRUEBA';
    const anchoVeredicto = doc.font('Helvetica-Bold').fontSize(20).widthOfString(textoVeredicto);
    const veredictoX = col3X + col3Ancho - anchoVeredicto;
    return { col2X, col2Ancho: veredictoX - 12 - col2X, col3X, col3Ancho, veredictoX, textoVeredicto };
  }

  private dibujarResultadoDestacado(doc: PDFKit.PDFDocument, resultado: ResultadoDestacadoPdf) {
    const x = doc.page.margins.left;
    const anchoContenido = this.anchoContenido(doc);
    const altoCaja = 90;

    this.asegurarEspacio(doc, altoCaja + 20);
    const cajaY = doc.y;

    const colorAprueba = resultado.aprueba ? VERDE_APRUEBA : ROJO_NO_APRUEBA;

    doc.save();
    doc.rect(x, cajaY, anchoContenido, altoCaja).fill('#FFFFFF');
    doc.rect(x, cajaY, anchoContenido, altoCaja).lineWidth(1).stroke(BORDE_GRIS);
    doc.rect(x, cajaY, 4, altoCaja).fill(colorAprueba);
    doc.restore();

    // Columna 1: % de cumplimiento, en grande
    const col1X = x + 20;
    doc
      .fillColor(GRIS_CLARO)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('CUMPLIMIENTO BPM', col1X, cajaY + 14, { width: 130 });
    doc
      .fillColor(AZUL_OSCURO)
      .font('Helvetica-Bold')
      .fontSize(28)
      .text(`${resultado.cumplimientoPct.toFixed(1)}%`, col1X, cajaY + 26, { width: 130 });

    // Columna 2: desglose de NC + nivel de riesgo + frecuencia, sin invadir el veredicto de la derecha
    const { col2X, col2Ancho, col3X, col3Ancho, textoVeredicto } = this.calcularColumnasResultado(doc, x, anchoContenido, resultado);
    doc
      .fillColor(GRIS_CLARO)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('NO CONFORMIDADES', col2X, cajaY + 14, { width: col2Ancho, lineBreak: false });
    const lineasDesglose = [
      `Críticas: ${resultado.ncCriticas}   Mayores: ${resultado.ncMayores}   Menores: ${resultado.ncMenores}`,
      `Nivel de riesgo: ${resultado.nivelRiesgo}`,
      ...(resultado.frecuencia ? [`Frecuencia: ${resultado.frecuencia}`] : []),
    ];
    lineasDesglose.forEach((linea, i) => {
      doc.fillColor(GRIS_TEXTO).font('Helvetica').fontSize(this.tamanoQueCabe(doc, linea, col2Ancho, 9, 6.5));
      doc.text(linea, col2X, cajaY + 27 + i * 13, { width: col2Ancho, lineBreak: false });
    });

    // Columna 3: Aprueba / No aprueba, en grande y coloreado, a la derecha
    doc
      .fillColor(colorAprueba)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(textoVeredicto, col3X, cajaY + 32, { width: col3Ancho, align: 'right' });

    doc.y = cajaY + altoCaja + 20;
    doc.x = x;
  }

  private dibujarTablaNoConformidades(doc: PDFKit.PDFDocument, filas: FilaNoConformidad[]) {
    const x = doc.page.margins.left;
    const anchoContenido = this.anchoContenido(doc);

    const colItem = anchoContenido * 0.3;
    const colGravedad = anchoContenido * 0.14;
    const colCalificacion = anchoContenido * 0.16;
    const colObservacion = anchoContenido * 0.4;

    this.asegurarEspacio(doc, 40);
    doc
      .fillColor(AZUL_INSTITUCIONAL)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('NO CONFORMIDADES DETECTADAS', x, doc.y);
    doc.y += 14;

    const dibujarEncabezadoTabla = () => {
      const filaY = doc.y;
      doc.save();
      doc.rect(x, filaY, anchoContenido, 20).fill(FONDO_GRIS);
      doc.restore();
      doc.fillColor(GRIS_TEXTO).font('Helvetica-Bold').fontSize(8.5);
      doc.text('Ítem evaluado', x + 6, filaY + 6, { width: colItem - 6 });
      doc.text('Gravedad', x + colItem, filaY + 6, { width: colGravedad });
      doc.text('Calificación', x + colItem + colGravedad, filaY + 6, { width: colCalificacion });
      doc.text('Observación', x + colItem + colGravedad + colCalificacion, filaY + 6, { width: colObservacion - 6 });
      doc.y = filaY + 20;
    };

    dibujarEncabezadoTabla();

    doc.font('Helvetica').fontSize(8.5);
    for (const fila of filas) {
      const altoObservacion = doc.heightOfString(fila.observacion || 'N/A', { width: colObservacion - 10 });
      const altoItem = doc.heightOfString(fila.item, { width: colItem - 10 });
      const altoFila = Math.max(altoObservacion, altoItem, 16) + 10;

      this.asegurarEspacio(doc, altoFila + 20);
      if (doc.y === doc.page.margins.top) {
        // Se agregó página nueva dentro del loop -- repetir encabezado de tabla
        dibujarEncabezadoTabla();
      }

      const filaY = doc.y;
      doc.save();
      doc.rect(x, filaY, anchoContenido, altoFila).lineWidth(0.5).stroke(BORDE_GRIS);
      doc.restore();

      doc.fillColor(GRIS_TEXTO).font('Helvetica').fontSize(8.5);
      doc.text(fila.item, x + 6, filaY + 6, { width: colItem - 6 });

      const colorGravedad = COLOR_GRAVEDAD[fila.gravedad];
      const pillAncho = 52;
      const pillX = x + colItem + (colGravedad - pillAncho) / 2;
      doc.save();
      doc.roundedRect(pillX, filaY + 4, pillAncho, 14, 7).fill(colorGravedad);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(ETIQUETA_GRAVEDAD[fila.gravedad], pillX, filaY + 7.5, { width: pillAncho, align: 'center' });
      doc.restore();

      doc.fillColor(GRIS_TEXTO).font('Helvetica').fontSize(8.5);
      doc.text(fila.calificacion, x + colItem + colGravedad, filaY + 6, { width: colCalificacion });
      doc.text(fila.observacion || 'N/A', x + colItem + colGravedad + colCalificacion, filaY + 6, {
        width: colObservacion - 10,
      });

      doc.y = filaY + altoFila;
      doc.x = x;
    }

    doc.y += 16;
    doc.x = x;
  }

  private dibujarSeccion(doc: PDFKit.PDFDocument, seccion: SeccionPdf) {
    const x = doc.page.margins.left;
    const anchoContenido = this.anchoContenido(doc);
    const texto = this.normalizarTextoSeccion(seccion.contenido);
    const esEstadoVacio = texto === 'Sin información registrada.';

    const anchoTexto = anchoContenido - 20;
    doc.font('Helvetica').fontSize(9.5);
    const altoTexto = doc.heightOfString(texto, { width: anchoTexto });
    const altoCaja = altoTexto + 24;

    const altoPaginaUtil = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
    if (altoCaja + 34 > altoPaginaUtil) {
      this.dibujarSeccionLarga(doc, seccion.titulo, texto, x, anchoContenido, anchoTexto);
      return;
    }

    this.asegurarEspacio(doc, altoCaja + 34);
    this.dibujarCajaSeccion(doc, seccion.titulo, texto, esEstadoVacio, x, anchoContenido, anchoTexto);
  }

  /** Título + caja con el texto de una sección, a partir de la posición actual. Deja `doc.y` debajo de la caja. */
  private dibujarCajaSeccion(
    doc: PDFKit.PDFDocument,
    titulo: string,
    texto: string,
    esEstadoVacio: boolean,
    x: number,
    anchoContenido: number,
    anchoTexto: number,
  ) {
    doc.font('Helvetica').fontSize(9.5);
    const altoCaja = doc.heightOfString(texto, { width: anchoTexto }) + 24;

    doc
      .fillColor(AZUL_OSCURO)
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(titulo, x, doc.y);
    doc.y += 14;

    const cajaY = doc.y;
    doc.save();
    doc.rect(x, cajaY, anchoContenido, altoCaja).fill(esEstadoVacio ? '#FAFAFA' : '#FFFFFF');
    doc.rect(x, cajaY, 2, altoCaja).fill(BORDE_GRIS);
    doc.rect(x, cajaY, anchoContenido, altoCaja).lineWidth(1).stroke(BORDE_GRIS);
    doc.restore();

    doc
      .fillColor(esEstadoVacio ? GRIS_CLARO : GRIS_TEXTO)
      .font('Helvetica')
      .fontSize(9.5)
      .text(texto, x + 10, cajaY + 10, { width: anchoTexto });

    doc.y = cajaY + altoCaja + 16;
    doc.x = x;
  }

  /**
   * Sección más alta que una página entera: se parte en trozos que caben en el espacio que queda de la
   * página actual y luego en páginas completas, cada uno en su propia caja (los siguientes llevan
   * "(continuación)" en el título). Antes la caja desbordaba el pie de página.
   */
  private dibujarSeccionLarga(doc: PDFKit.PDFDocument, titulo: string, texto: string, x: number, anchoContenido: number, anchoTexto: number) {
    const relleno = 14 + 24 + 6; // título + márgenes internos de la caja + holgura
    const limiteInferior = () => doc.page.height - doc.page.margins.bottom;
    if (doc.y + relleno + 40 > limiteInferior()) doc.addPage();

    doc.font('Helvetica').fontSize(9.5);
    const altoPrimero = limiteInferior() - doc.y - relleno;
    const altoPagina = doc.page.height - doc.page.margins.top - doc.page.margins.bottom - relleno;
    const trozos = this.partirTextoPorAltura(doc, texto, anchoTexto, [altoPrimero, altoPagina]);

    trozos.forEach((trozo, i) => {
      if (i > 0) doc.addPage();
      this.dibujarCajaSeccion(doc, i === 0 ? titulo : `${titulo} (continuación)`, trozo, false, x, anchoContenido, anchoTexto);
    });
  }

  /**
   * Parte `texto` en trozos por palabras, de modo que el trozo n mida como máximo `altos[n]` de alto (el
   * último valor se repite para los trozos siguientes). Siempre avanza al menos una palabra.
   */
  private partirTextoPorAltura(doc: PDFKit.PDFDocument, texto: string, ancho: number, altos: number[]): string[] {
    const palabras = texto.match(/\S+\s*/g) ?? [];
    const trozos: string[] = [];
    let inicio = 0;
    while (inicio < palabras.length) {
      const limite = altos[Math.min(trozos.length, altos.length - 1)];
      let minimo = 1;
      let maximo = palabras.length - inicio;
      while (minimo < maximo) {
        const medio = Math.ceil((minimo + maximo) / 2);
        const alto = doc.heightOfString(palabras.slice(inicio, inicio + medio).join('').trimEnd(), { width: ancho });
        if (alto <= limite) minimo = medio;
        else maximo = medio - 1;
      }
      trozos.push(palabras.slice(inicio, inicio + minimo).join('').trimEnd());
      inicio += minimo;
    }
    return trozos;
  }

  private normalizarTextoSeccion(contenido: string): string {
    if (!contenido || !contenido.trim() || contenido.trim() === 'N/A' || contenido.startsWith('Sin ')) {
      return 'Sin información registrada.';
    }
    return contenido.trim();
  }

  /** Dibuja el sello institucional circular oficial de certificación SINEC / DIGEMAPS */
  /** Radio del sello: con menos, el texto institucional no cabe sin cruzar los anillos. */
  private readonly radioSello = 36;

  /**
   * Distribución de los textos del sello, medida con la fuente real: cada fila se reduce (sin bajar de
   * 3.8 pt) hasta caber en la cuerda del círculo interior a la altura donde se dibuja, y ninguna cae
   * sobre una línea divisoria. `dy` es el desplazamiento vertical del centro de la fila respecto al centro del sello.
   */
  private calcularFilasSello(doc: PDFKit.PDFDocument, r: number, fechaStr: string) {
    const radioInterior = r - 6;
    const definiciones = [
      { texto: 'REPÚBLICA', dy: -19.5, fuente: 'Helvetica-Bold', tamano: 5, color: AZUL_INSTITUCIONAL },
      { texto: 'DOMINICANA', dy: -13.5, fuente: 'Helvetica-Bold', tamano: 5, color: AZUL_INSTITUCIONAL },
      { texto: 'APROBADO Y', dy: -4.5, fuente: 'Helvetica-Bold', tamano: 6, color: AZUL_INSTITUCIONAL },
      { texto: 'VALIDADO', dy: 2, fuente: 'Helvetica-Bold', tamano: 6, color: AZUL_INSTITUCIONAL },
      { texto: fechaStr, dy: 12.5, fuente: 'Helvetica-Bold', tamano: 5, color: GRIS_TEXTO },
      { texto: 'SINEC · DIGEMAPS', dy: 19.5, fuente: 'Helvetica', tamano: 4.5, color: AZUL_INSTITUCIONAL },
    ];
    const filas = definiciones.map((d) => {
      let tamano = d.tamano;
      const ancho = () => doc.font(d.fuente).fontSize(tamano).widthOfString(d.texto);
      const cuerda = () => 2 * Math.sqrt(Math.max(0, radioInterior ** 2 - (Math.abs(d.dy) + tamano * 0.6) ** 2));
      while (tamano > 3.8 && ancho() > cuerda()) tamano -= 0.1;
      return { ...d, tamano, ancho: ancho() };
    });
    return { filas, divisores: [-9.5, 7] };
  }

  /** Dibuja el sello institucional circular oficial de certificación SINEC / DIGEMAPS */
  private dibujarSelloCertificacion(doc: PDFKit.PDFDocument, cx: number, cy: number, fechaStr: string) {
    const r = this.radioSello;
    const radioInterior = r - 6;
    const { filas, divisores } = this.calcularFilasSello(doc, r, fechaStr);
    doc.save();
    // Círculo exterior doble
    doc.circle(cx, cy, r).lineWidth(1.8).strokeColor(AZUL_INSTITUCIONAL).stroke();
    doc.circle(cx, cy, r - 2.5).lineWidth(0.8).strokeColor(AZUL_INSTITUCIONAL).stroke();
    // Círculo punteado interior
    doc.circle(cx, cy, r - 5.5).lineWidth(0.8).dash(3, { space: 2 }).strokeColor(AZUL_INSTITUCIONAL).stroke().undash();

    // Líneas divisorias horizontales, del largo de la cuerda a esa altura
    for (const dy of divisores) {
      const mitad = Math.sqrt(radioInterior ** 2 - dy ** 2) - 2;
      doc.moveTo(cx - mitad, cy + dy).lineTo(cx + mitad, cy + dy).lineWidth(0.6).strokeColor(AZUL_INSTITUCIONAL).stroke();
    }

    // Textos institucionales dentro del sello, centrados en su fila
    for (const fila of filas) {
      doc.fillColor(fila.color).font(fila.fuente).fontSize(fila.tamano);
      const alto = doc.currentLineHeight();
      doc.text(fila.texto, cx - fila.ancho / 2, cy + fila.dy - alto / 2, { lineBreak: false });
    }

    doc.restore();
  }

  /** Dibuja el bloque inferior con QR real escaneable, firma manuscrita y sello/firma del coordinador */
  private dibujarBloqueFirmasYQr(doc: PDFKit.PDFDocument, data: DocumentoPdfData, qrBuffer: Buffer | null) {
    const altoBloque = 100;
    this.asegurarEspacio(doc, altoBloque + 20);

    const x = doc.page.margins.left;
    const ancho = this.anchoContenido(doc);
    const yInicio = doc.y + 6;

    // Línea horizontal divisoria superior
    doc.save();
    doc.moveTo(x, yInicio).lineTo(x + ancho, yInicio).lineWidth(1.5).strokeColor(AZUL_INSTITUCIONAL).stroke();
    doc.restore();

    const yContenido = yInicio + 10;
    const colAncho = ancho / 3;

    // Columna 1: Validación Digital QR Real
    const col1X = x;
    if (qrBuffer) {
      try {
        const qrTam = 56;
        doc.image(qrBuffer, col1X, yContenido, { fit: [qrTam, qrTam] });
        const textoQrX = col1X + qrTam + 6;
        const textoQrAncho = colAncho - qrTam - 10;

        doc
          .fillColor(AZUL_INSTITUCIONAL)
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .text('Validación QR', textoQrX, yContenido + 2, { width: textoQrAncho });
        doc
          .fillColor(GRIS_TEXTO)
          .font('Helvetica')
          .fontSize(6)
          .text('Escanee con la cámara para verificar autenticidad en SINEC / DIGEMAPS.', textoQrX, doc.y + 2, {
            width: textoQrAncho,
          });
        if (data.codigo) {
          doc
            .fillColor(GRIS_CLARO)
            .font('Helvetica-Bold')
            .fontSize(6)
            .text(`ID: ${data.codigo}`, textoQrX, doc.y + 2, { width: textoQrAncho });
        }
      } catch (err) {
        this.logger.warn(`No se pudo embeber el QR en el PDF: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Columna 2: Firma Manuscrita del Técnico Evaluador
    const col2X = x + colAncho + 5;
    const col2Ancho = colAncho - 10;
    const firma = this.rutaFirma();
    const altoFirma = 36;
    const yFirma = yContenido;

    if (data.incluirFirma && firma) {
      try {
        doc.image(firma, col2X + (col2Ancho - 90) / 2, yFirma, { fit: [90, altoFirma] });
      } catch (err) {
        this.logger.warn(`No se pudo embeber la firma manuscrita: ${err instanceof Error ? err.message : err}`);
      }
    }

    const yLineaFirma = yFirma + altoFirma + 4;
    doc.save();
    doc.moveTo(col2X + 10, yLineaFirma).lineTo(col2X + col2Ancho - 10, yLineaFirma).lineWidth(0.8).strokeColor(BORDE_GRIS).stroke();
    doc.restore();

    doc
      .fillColor(AZUL_OSCURO)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(data.tecnicoNombre ?? 'Lic. Roberto Morales', col2X, yLineaFirma + 4, {
        width: col2Ancho,
        align: 'center',
      });
    doc
      .fillColor(GRIS_CLARO)
      .font('Helvetica')
      .fontSize(6.5)
      .text(data.tecnicoCargo ?? 'Técnico Evaluador Autorizado BPM', col2X, doc.y + 1, {
        width: col2Ancho,
        align: 'center',
      });
    doc
      .fillColor(GRIS_CLARO)
      .font('Helvetica')
      .fontSize(5.5)
      .text('Reg. Profesional: TEC-BPM-RD', col2X, doc.y + 1, {
        width: col2Ancho,
        align: 'center',
      });

    // Columna 3: Sello Oficial Circular y Visto Bueno Coordinador
    const col3X = x + colAncho * 2 + 5;
    const col3Ancho = colAncho - 10;
    const fechaHoy = data.fechaEmision ?? new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

    if (data.incluirSello) {
      const stampCenterX = col3X + col3Ancho / 2;
      const stampCenterY = yContenido + this.radioSello - 2;
      this.dibujarSelloCertificacion(doc, stampCenterX, stampCenterY, fechaHoy);

      doc
        .fillColor(AZUL_OSCURO)
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(data.coordinadorNombre ?? 'Ing. Carlos Peña', col3X, stampCenterY + this.radioSello + 4, {
          width: col3Ancho,
          align: 'center',
        });
      doc
        .fillColor(GRIS_CLARO)
        .font('Helvetica')
        .fontSize(6)
        .text(data.coordinadorCargo ?? 'Coordinador Técnico DIGEMAPS', col3X, doc.y + 1, {
          width: col3Ancho,
          align: 'center',
        });
    } else {
      const yCoord = yContenido + 8;
      doc
        .fillColor(AZUL_INSTITUCIONAL)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('FIRMADO DIGITALMENTE', col3X, yCoord, { width: col3Ancho, align: 'center' });
      doc
        .fillColor(GRIS_CLARO)
        .font('Helvetica')
        .fontSize(6)
        .text('Certificado: MSP-DIGEMAPS-2026', col3X, doc.y + 1, { width: col3Ancho, align: 'center' });

      doc.save();
      doc.moveTo(col3X + 10, yLineaFirma).lineTo(col3X + col3Ancho - 10, yLineaFirma).lineWidth(0.8).strokeColor(BORDE_GRIS).stroke();
      doc.restore();

      doc
        .fillColor(AZUL_OSCURO)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(data.coordinadorNombre ?? 'Ing. Carlos Peña', col3X, yLineaFirma + 4, {
          width: col3Ancho,
          align: 'center',
        });
      doc
        .fillColor(GRIS_CLARO)
        .font('Helvetica')
        .fontSize(6.5)
        .text(data.coordinadorCargo ?? 'Coordinador Técnico DIGEMAPS', col3X, doc.y + 1, {
          width: col3Ancho,
          align: 'center',
        });
    }

    doc.y = yInicio + altoBloque + 10;
    doc.x = x;
  }

  /** Pie de página institucional, dibujado en TODAS las páginas (incluidas las que pdfkit agregó solo por desborde de contenido). */
  private dibujarPiePaginaEnTodas(doc: PDFKit.PDFDocument) {
    const rango = doc.bufferedPageRange();
    const fechaHoy = new Date().toISOString().split('T')[0];

    for (let i = rango.start; i < rango.start + rango.count; i++) {
      doc.switchToPage(i);
      const x = doc.page.margins.left;
      const anchoContenido = this.anchoContenido(doc);
      const margenInferior = doc.page.margins.bottom;
      const y = doc.page.height - margenInferior + 12;

      // El pie queda por debajo del margen inferior: con el margen activo pdfkit
      // agrega una página nueva por cada texto ahí. Se anula solo mientras se dibuja.
      doc.page.margins.bottom = 0;
      doc.save();
      doc
        .moveTo(x, y - 6)
        .lineTo(x + anchoContenido, y - 6)
        .lineWidth(0.5)
        .strokeColor(BORDE_GRIS)
        .stroke();
      doc
        .fillColor(GRIS_CLARO)
        .font('Helvetica')
        .fontSize(7.5)
        .text('DIGEMAPS | Sistema SINEC - Evaluación Basada en Riesgo (BPM) | Documento oficial', x, y, {
          width: anchoContenido - 100,
        });
      doc
        .fillColor(GRIS_CLARO)
        .font('Helvetica')
        .fontSize(7.5)
        .text(`${fechaHoy}  ·  Página ${i - rango.start + 1} de ${rango.count}`, x, y, {
          width: anchoContenido,
          align: 'right',
        });
      doc.restore();
      doc.page.margins.bottom = margenInferior;
    }
  }
}
