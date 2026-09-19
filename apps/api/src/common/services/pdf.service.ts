import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';

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
}

const AZUL_INSTITUCIONAL = '#2A6DB0';
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

<<<<<<< HEAD
    // --- MÁRGENES Y DIMENSIONES (Letter 612 x 792 pt) ---
    const marginX = 45;
    const contentWidth = 522; // 612 - 45*2
    const rightMarginX = marginX + contentWidth;

    // --- 1. ENCABEZADO CORPORATIVO E INSTITUCIONAL ---
    // Barra superior delgada de identidad corporativa en azul cobalto #1E40AF
    lineas.push('q');
    lineas.push('0.12 0.25 0.69 rg');
    lineas.push(`${marginX} 755 ${contentWidth} 3 re f`);
    lineas.push('Q');

    // Subtítulo de institución
    lineas.push('BT');
    lineas.push('/F2 8 Tf');
    lineas.push('0.45 0.50 0.55 rg'); // Gris corporativo neutral
    lineas.push(`${marginX} 742 Td`);
    lineas.push(`(${this.escapePdfText('REPÚBLICA DOMINICANA | MINISTERIO DE SALUD PÚBLICA - DIGEMAPS')}) Tj`);
    lineas.push('ET');

    // Título principal del documento
    lineas.push('BT');
    lineas.push('/F2 15 Tf');
    lineas.push('0.06 0.09 0.16 rg'); // Azul muy oscuro #0F172A
    lineas.push(`${marginX} 724 Td`);
    lineas.push(`(${this.escapePdfText(doc.titulo)}) Tj`);
    lineas.push('ET');

    // Línea divisoria bajo el título
    lineas.push('q');
    lineas.push('0.89 0.91 0.94 rg'); // #E2E8F0
    lineas.push(`${marginX} 714 ${contentWidth} 1 re f`);
    lineas.push('Q');

    let currentY = 695;

    // --- 2. TARJETA SUBTÍTULO / ESTABLECIMIENTO ---
    if (doc.subtitulo) {
      lineas.push('BT');
      lineas.push('/F2 11 Tf');
      lineas.push('0.12 0.16 0.23 rg');
      lineas.push(`${marginX} ${currentY} Td`);
      lineas.push(`(${this.escapePdfText(doc.subtitulo)}) Tj`);
      lineas.push('ET');

      lineas.push('BT');
      lineas.push('/F1 8.5 Tf');
      lineas.push('0.45 0.50 0.55 rg');
      lineas.push(`${marginX} ${currentY - 12} Td`);
      lineas.push(`(${this.escapePdfText('Sistema de Evaluación Basada en Riesgo - EBR/BPM')}) Tj`);
      lineas.push('ET');

      currentY -= 32;
    }

    // --- 3. SECCIÓN DATOS GENERALES (GRILLA CORPORATIVA DE 2 COLUMNAS) ---
    if (doc.metadata.length > 0) {
      // Título de la sección de datos
      lineas.push('q');
      lineas.push('0.12 0.25 0.69 rg'); // Indicador azul
      lineas.push(`${marginX} ${currentY - 1} 3 11 re f`);
      lineas.push('Q');

      lineas.push('BT');
      lineas.push('/F2 10 Tf');
      lineas.push('0.12 0.25 0.69 rg');
      lineas.push(`${marginX + 8} ${currentY} Td`);
      lineas.push('(DATOS GENERALES) Tj');
      lineas.push('ET');
      currentY -= 14;

      const numFilas = Math.ceil(doc.metadata.length / 2);
      const altoTarjeta = numFilas * 20 + 8;

      // Tarjeta contenedora de metadatos
      lineas.push('q');
      lineas.push('0.97 0.98 0.99 rg'); // Fondo #F8FAFC
      lineas.push(`${marginX} ${currentY - altoTarjeta} ${contentWidth} ${altoTarjeta} re f`);
      lineas.push('0.89 0.91 0.94 rg'); // Borde sutil #E2E8F0
      lineas.push(`${marginX} ${currentY - altoTarjeta} ${contentWidth} ${altoTarjeta} re s`);
      lineas.push('Q');

      let rowY = currentY - 18;
      for (let i = 0; i < doc.metadata.length; i += 2) {
        const item1 = doc.metadata[i];
        const item2 = doc.metadata[i + 1];

        // Columna 1
        this.renderMetadatoItem(lineas, item1, marginX + 10, 145, rowY);

        // Columna 2
        if (item2) {
          this.renderMetadatoItem(lineas, item2, marginX + 265, marginX + 365, rowY);
        }

        rowY -= 20;
      }

      currentY -= (altoTarjeta + 20);
    }

    // --- 4. SECCIONES DEL INFORME (BLOQUES SEPARADOS CON ESTADO VACÍO ELEGANTE) ---
    for (const sec of doc.secciones) {
      if (currentY < 120) break; // Control de desborde

      // Encabezado de la sección
      lineas.push('q');
      lineas.push('0.12 0.25 0.69 rg');
      lineas.push(`${marginX} ${currentY - 1} 3 11 re f`);
      lineas.push('Q');

      lineas.push('BT');
      lineas.push('/F2 10.5 Tf');
      lineas.push('0.06 0.09 0.16 rg');
      lineas.push(`${marginX + 8} ${currentY} Td`);
      lineas.push(`(${this.escapePdfText(sec.titulo)}) Tj`);
      lineas.push('ET');
      currentY -= 14;

      // Normalizar texto vacío
      const textoLimpio = this.normalizarTextoSeccion(sec.contenido);
      const esEstadoVacio = textoLimpio === 'Sin información registrada.';

      const parrafos = this.wrapText(textoLimpio, 90);
      const altoBloque = parrafos.length * 13 + 12;

      // Caja contenedora de la sección
      lineas.push('q');
      if (esEstadoVacio) {
        lineas.push('0.98 0.98 0.99 rg'); // Fondo tenue para estado vacío
      } else {
        lineas.push('1 1 1 rg'); // Fondo blanco puro
      }
      lineas.push(`${marginX} ${currentY - altoBloque} ${contentWidth} ${altoBloque} re f`);
      
      // Borde lateral izquierdo
      lineas.push('0.80 0.84 0.88 rg'); // #CBD5E1
      lineas.push(`${marginX} ${currentY - altoBloque} 2 ${altoBloque} re f`);
      
      // Borde de la caja
      lineas.push('0.89 0.91 0.94 rg'); // #E2E8F0
      lineas.push(`${marginX} ${currentY - altoBloque} ${contentWidth} ${altoBloque} re s`);
      lineas.push('Q');

      let textY = currentY - 14;
      for (const linea of parrafos) {
        if (textY < 55) break;
        lineas.push('BT');
        if (esEstadoVacio) {
          lineas.push('/F1 9 Tf');
          lineas.push('0.50 0.55 0.60 rg'); // Gris sutil para estado vacío
        } else {
          lineas.push('/F1 9.5 Tf');
          lineas.push('0.15 0.20 0.25 rg'); // Texto oscuro de lectura
        }
        lineas.push(`${marginX + 10} ${textY} Td`);
        lineas.push(`(${this.escapePdfText(linea)}) Tj`);
        lineas.push('ET');
        textY -= 13;
      }

      currentY -= (altoBloque + 16);
    }

    // --- 5. PIE DE PÁGINA INSTITUCIONAL ---
    lineas.push('q');
    lineas.push('0.89 0.91 0.94 rg');
    lineas.push(`${marginX} 45 ${contentWidth} 1 re f`); // Divisoria
    lineas.push('Q');

    lineas.push('BT');
    lineas.push('/F2 7.5 Tf');
    lineas.push('0.30 0.35 0.42 rg');
    lineas.push(`${marginX} 32 Td`);
    lineas.push(`(${this.escapePdfText('DIGEMAPS | Sistema de Evaluación Basada en Riesgo - EBR/BPM')}) Tj`);
    lineas.push('ET');

    const fechaHoy = new Date().toISOString().split('T')[0];
    lineas.push('BT');
    lineas.push('/F1 7.5 Tf');
    lineas.push('0.50 0.55 0.60 rg');
    lineas.push(`${rightMarginX - 160} 32 Td`);
    lineas.push(`(${this.escapePdfText(`Documento Oficial de Auditoria | ${fechaHoy}`)}) Tj`);
    lineas.push('ET');

    const streamContent = lineas.join('\n');
    return this.ensamblarPdfBuffer(streamContent);
=======
  /**
   * Ruta del logo institucional embebido en el encabezado. Se resuelve en
   * runtime (no en build) porque en desarrollo corre bajo ts-node
   * (__dirname = src/common/services) y compilado corre bajo Node
   * (__dirname = dist/common/services) -- en ambos casos el logo vive dos
   * niveles arriba, en <raíz>/assets/logo.png, y nest-cli.json copia
   * src/assets/** a dist/assets/** en cada build (ver "assets" en
   * nest-cli.json). Si el archivo no existe todavía, se dibuja un
   * placeholder vectorial en vez de fallar -- así el servicio nunca se
   * cae por falta del logo real.
   */
  private rutaLogo(): string | null {
    const candidatos = [
      join(__dirname, '..', '..', 'assets', 'logo.png'),
      join(__dirname, '..', '..', '..', 'src', 'assets', 'logo.png'),
    ];
    for (const ruta of candidatos) {
      if (existsSync(ruta)) return ruta;
    }
    return null;
>>>>>>> origin/develop
  }

  async generarDocumentoPdf(data: DocumentoPdfData): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: this.margin, bottom: this.margin, left: this.margin, right: this.margin },
      bufferPages: true,
    });

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
    // logo.png, si no un placeholder vectorial (ver dibujarLogoPlaceholder) --
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

  /** Placeholder vectorial (escudo simple) usado mientras no exista un logo.png real. */
  private dibujarLogoPlaceholder(doc: PDFKit.PDFDocument, x: number, y: number, tam: number) {
    doc.save();
    doc.roundedRect(x, y, tam, tam, 6).fill(AZUL_INSTITUCIONAL);
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('EBR', x, y + tam / 2 - 7, { width: tam, align: 'center' });
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

    // Columna 2: desglose de NC + nivel de riesgo + frecuencia
    const col2X = x + 190;
    doc
      .fillColor(GRIS_CLARO)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('NO CONFORMIDADES', col2X, cajaY + 14, { width: 220 });
    doc
      .fillColor(GRIS_TEXTO)
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Críticas: ${resultado.ncCriticas}   Mayores: ${resultado.ncMayores}   Menores: ${resultado.ncMenores}`,
        col2X,
        cajaY + 27,
        { width: 260 },
      );
    doc
      .fillColor(GRIS_TEXTO)
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Nivel de riesgo: ${resultado.nivelRiesgo}` + (resultado.frecuencia ? `   ·   Frecuencia: ${resultado.frecuencia}` : ''),
        col2X,
        cajaY + 42,
        { width: 300 },
      );

    // Columna 3: Aprueba / No aprueba, en grande y coloreado, a la derecha
    const col3Ancho = 140;
    const col3X = x + anchoContenido - col3Ancho - 15;
    doc
      .fillColor(colorAprueba)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(resultado.aprueba ? 'APRUEBA' : 'NO APRUEBA', col3X, cajaY + 32, { width: col3Ancho, align: 'right' });

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

    this.asegurarEspacio(doc, altoCaja + 34);

    doc
      .fillColor(AZUL_OSCURO)
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(seccion.titulo, x, doc.y);
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

  private normalizarTextoSeccion(contenido: string): string {
    if (!contenido || !contenido.trim() || contenido.trim() === 'N/A' || contenido.startsWith('Sin ')) {
      return 'Sin información registrada.';
    }
    return contenido.trim();
  }

  /** Pie de página institucional, dibujado en TODAS las páginas (incluidas las que pdfkit agregó solo por desborde de contenido). */
  private dibujarPiePaginaEnTodas(doc: PDFKit.PDFDocument) {
    const rango = doc.bufferedPageRange();
    const fechaHoy = new Date().toISOString().split('T')[0];

    for (let i = rango.start; i < rango.start + rango.count; i++) {
      doc.switchToPage(i);
      const x = doc.page.margins.left;
      const anchoContenido = this.anchoContenido(doc);
      const y = doc.page.height - doc.page.margins.bottom + 12;

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
        .text('DIGEMAPS | Sistema de Evaluación Basada en Riesgo - EBR/BPM | Documento oficial', x, y, {
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
    }
  }
}
