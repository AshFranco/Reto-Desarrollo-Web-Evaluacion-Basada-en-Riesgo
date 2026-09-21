import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
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

export interface DatosEstablecimientoPdf {
  regId?: string;
  empresaRazonSocial: string;
  rnc: string;
  direccionFisica: string;
  municipioDps: string;
  representanteLegal: string;
  telefonoContacto: string;
}

export interface DatosControlInternoPdf {
  fechaInspeccionInicial: string;
  noPermisoSanitario: string;
  fechaInspeccionActual: string;
  motivoInspeccion: string;
  tecnicoEvaluador: string;
  coordinadorRevisor: string;
  frecuenciaFiscalizacion: string;
  dictamenTecnico: string;
  /** undefined = todavía no hay resultado: el dictamen se muestra como N/A. */
  esFavorable?: boolean;
}

export interface DocumentoPdfData {
  titulo: string;
  subtitulo?: string;
  codigo?: string;
  version?: string;
  fechaEmision?: string;

  // Datos estructurados oficiales Ficha BPM (Mockup)
  datosEstablecimiento?: DatosEstablecimientoPdf;
  datosControlInterno?: DatosControlInternoPdf;

  // Metadatos genéricos
  metadata?: MetadatoPdf[];
  metadataTitulo?: string;
  metadataControl?: MetadatoPdf[];
  metadataControlTitulo?: string;

  resultado?: ResultadoDestacadoPdf;
  noConformidades?: FilaNoConformidad[];
  secciones?: SeccionPdf[];

  incluirSello?: boolean;
  incluirQr?: boolean;
  qrUrl?: string;
  incluirFirma?: boolean;
  tecnicoNombre?: string;
  tecnicoCargo?: string;
  tecnicoRegistro?: string;
  coordinadorNombre?: string;
  coordinadorCargo?: string;
  coordinadorCertificado?: string;
}

/** Lo que se muestra cuando no hay un dato real: nunca se inventa uno. */
const NA = 'N/A';

const AZUL_INSTITUCIONAL = '#002B49';
const AZUL_OSCURO = '#0F172A';
const AZUL_MEDIO = '#0F3A66';
const GRIS_TEXTO = '#334155';
const GRIS_CLARO = '#64748B';
const GRIS_BORDE = '#E2E8F0';
const GRIS_FONDO = '#F8FAFC';
const VERDE_BG = '#DEF7EC';
const VERDE_TXT = '#03543F';
const VERDE_BORDE = '#BCF0DA';
const VERDE_APRUEBA = '#059669';
const AMBAR_BG = '#FEF08A';
const AMBAR_TXT = '#713F12';
const AMBAR_BORDE = '#FDE047';
const ROJO_BG = '#FEE2E2';
const ROJO_TXT = '#991B1B';
const ROJO_BORDE = '#FECACA';
const ROJO_NO_APRUEBA = '#DC2626';

const COLOR_GRAVEDAD: Record<GravedadNoConformidad, string> = {
  CRITICA: '#DC2626',
  MAYOR: '#D97706',
  MENOR: '#64748B',
};

const ETIQUETA_GRAVEDAD: Record<GravedadNoConformidad, string> = {
  CRITICA: 'Crítica',
  MAYOR: 'Mayor',
  MENOR: 'Menor',
};

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly margin = 40;

  private rutaLogoCompleto(): string | null {
    const candidatos = [
      join(__dirname, '..', '..', 'assets', 'logo-completo.png'),
      join(__dirname, '..', '..', '..', 'src', 'assets', 'logo-completo.png'),
      join(__dirname, '..', '..', 'assets', 'logo.png'),
      join(__dirname, '..', '..', '..', 'src', 'assets', 'logo.png'),
      join(__dirname, '..', '..', 'assets', 'logo-escudo.png'),
      join(__dirname, '..', '..', '..', 'src', 'assets', 'logo-escudo.png'),
    ];
    for (const ruta of candidatos) {
      if (existsSync(ruta)) return ruta;
    }
    return null;
  }

  private rutaLogo(): string | null {
    const candidatos = [
      join(__dirname, '..', '..', 'assets', 'logo-escudo.png'),
      join(__dirname, '..', '..', '..', 'src', 'assets', 'logo-escudo.png'),
      join(__dirname, '..', '..', 'assets', 'logo-completo.png'),
      join(__dirname, '..', '..', '..', 'src', 'assets', 'logo-completo.png'),
      join(__dirname, '..', '..', 'assets', 'logo.png'),
      join(__dirname, '..', '..', '..', 'src', 'assets', 'logo.png'),
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

  /** SHA-256 del contenido del documento: cambia si cambia cualquier dato mostrado. */
  private calcularHashContenido(data: DocumentoPdfData): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private async generarQrBuffer(url: string): Promise<Buffer | null> {
    try {
      return await QRCode.toBuffer(url, {
        type: 'png',
        margin: 0,
        width: 120,
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
    const esFichaOficial =
      Boolean(data.datosEstablecimiento || data.datosControlInterno) ||
      (data.titulo?.toUpperCase().includes('FICHA') ?? false) ||
      (!data.secciones || data.secciones.length === 0);

    const doc = new PDFDocument({
      size: 'LETTER',
      margins: esFichaOficial
        ? { top: 26, bottom: 20, left: 36, right: 36 }
        : { top: this.margin, bottom: this.margin, left: this.margin, right: this.margin },
      bufferPages: true,
      autoFirstPage: true,
    });

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

    if (esFichaOficial) {
      this.renderizarFichaOficial(doc, data, qrBuffer);
    } else {
      this.renderizarDocumentoGenerico(doc, data, qrBuffer);
    }

    doc.end();
    return listo;
  }

  // ===========================================================================
  // RENDERIZADOR 1: FICHA OFICIAL DE INSPECCIÓN BPM (IDÉNTICA AL MOCKUP APROBADO)
  // ===========================================================================
  private renderizarFichaOficial(
    doc: PDFKit.PDFDocument,
    data: DocumentoPdfData,
    qrBuffer: Buffer | null,
  ) {
    const x = doc.page.margins.left;
    const anchoContenido = doc.page.width - doc.page.margins.left - doc.page.margins.right; // 540 pt

    // 1. ENCABEZADO OFICIAL
    const logo = this.rutaLogoCompleto();
    const yHeader = 24;
    const logoW = 100;
    const logoH = 42;

    if (logo) {
      try {
        doc.image(logo, x, yHeader, { fit: [logoW, logoH] });
      } catch (err) {
        this.logger.warn(`Error al embeber logo: ${err}`);
        this.dibujarLogoPlaceholder(doc, x, yHeader, logoW, logoH);
      }
    } else {
      this.dibujarLogoPlaceholder(doc, x, yHeader, logoW, logoH);
    }

    // Textos centrales
    const centroX = x + logoW + 8;
    const centroW = 270;
    doc
      .fillColor(AZUL_INSTITUCIONAL)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(data.titulo || 'FICHA DE INSPECCIÓN BPM (OFICIAL)', centroX, yHeader + 3, { width: centroW });

    doc
      .fillColor(AZUL_INSTITUCIONAL)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(data.subtitulo || 'Evaluación Basada en Riesgo Sanitario · DIGEMAPS', centroX, doc.y + 2, { width: centroW });

    doc
      .fillColor(GRIS_CLARO)
      .font('Helvetica')
      .fontSize(8)
      .text('República Dominicana · Ministerio de Salud Pública', centroX, doc.y + 2, { width: centroW });

    // Metadatos derecha
    const derW = 180;
    const derX = x + anchoContenido - derW;
    const codigoTexto = data.codigo ? `Código: ${data.codigo}` : 'Código: F-BPM-2026-0042';
    const versionTexto = data.version ? `Versión Ficha: ${data.version}` : 'Versión Ficha: 1.0 (Vigente)';
    const fechaTexto = data.fechaEmision
      ? `Fecha de Emisión: ${data.fechaEmision}`
      : `Fecha de Emisión: ${new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    doc.fillColor(GRIS_TEXTO).font('Helvetica').fontSize(7.5).text(codigoTexto, derX, yHeader + 5, { width: derW, align: 'right' });
    doc.text(versionTexto, derX, doc.y + 2, { width: derW, align: 'right' });
    doc.text(fechaTexto, derX, doc.y + 2, { width: derW, align: 'right' });

    // Línea divisoria encabezado
    const yDivHeader = yHeader + logoH + 6;
    doc
      .moveTo(x, yDivHeader)
      .lineTo(x + anchoContenido, yDivHeader)
      .lineWidth(1.8)
      .strokeColor(AZUL_INSTITUCIONAL)
      .stroke();

    // 2. SECCIÓN: DATOS DEL ESTABLECIMIENTO Y CONTACTOS + SELLO OFICIAL
    const yFila1 = yDivHeader + 8;
    const altoFila1 = 98;
    const anchoColIzq = 375;
    const anchoColDer = anchoContenido - anchoColIzq - 10; // 155
    const xColDer = x + anchoColIzq + 10;

    // Caja Izquierda: Datos del establecimiento
    doc.save();
    doc.roundedRect(x, yFila1, anchoColIzq, altoFila1, 6).lineWidth(0.8).strokeColor(GRIS_BORDE).stroke();
    doc.restore();

    const regId = data.datosEstablecimiento?.regId || (data.metadata?.find(m => m.etiqueta.includes('ID'))?.valor ? `EST-${data.metadata.find(m => m.etiqueta.includes('ID'))?.valor}` : NA);

    doc
      .fillColor(AZUL_INSTITUCIONAL)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('DATOS DEL ESTABLECIMIENTO Y CONTACTOS', x + 10, yFila1 + 8);

    doc
      .fillColor(GRIS_CLARO)
      .font('Helvetica')
      .fontSize(7)
      .text(`REG-ID: ${regId}`, x + 10, yFila1 + 9, { width: anchoColIzq - 20, align: 'right' });

    const est = data.datosEstablecimiento;
    const empresaVal = est?.empresaRazonSocial || this.buscarMeta(data.metadata, ['Empresa', 'Razón Social']) || NA;
    const rncVal = est?.rnc || this.buscarMeta(data.metadata, ['RNC']) || NA;
    const dirVal = est?.direccionFisica || this.buscarMeta(data.metadata, ['Dirección', 'Calle']) || NA;
    const munVal = est?.municipioDps || this.buscarMeta(data.metadata, ['Municipio', 'DPS']) || NA;
    const repVal = est?.representanteLegal || this.buscarMeta(data.metadata, ['Representante', 'Titular']) || NA;
    const telVal = est?.telefonoContacto || this.buscarMeta(data.metadata, ['Teléfono']) || NA;

    const subColW = (anchoColIzq - 24) / 2;
    const yItemsFila1 = yFila1 + 24;
    const gapItem = 22;

    // Subcolumna 1
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6.5).text('Empresa / Razón Social:', x + 10, yItemsFila1);
    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(8).text(empresaVal, x + 10, yItemsFila1 + 8, { width: subColW });

    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6.5).text('Dirección Física:', x + 10, yItemsFila1 + gapItem);
    doc.fillColor(AZUL_OSCURO).font('Helvetica').fontSize(7.5).text(dirVal, x + 10, yItemsFila1 + gapItem + 8, { width: subColW });

    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6.5).text('Representante Legal:', x + 10, yItemsFila1 + gapItem * 2);
    doc.fillColor(AZUL_OSCURO).font('Helvetica').fontSize(7.5).text(repVal, x + 10, yItemsFila1 + gapItem * 2 + 8, { width: subColW });

    // Subcolumna 2
    const xSubCol2 = x + 14 + subColW;
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6.5).text('RNC / Cédula Titular:', xSubCol2, yItemsFila1);
    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(8).text(rncVal, xSubCol2, yItemsFila1 + 8, { width: subColW });

    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6.5).text('Municipio / DPS:', xSubCol2, yItemsFila1 + gapItem);
    doc.fillColor(AZUL_OSCURO).font('Helvetica').fontSize(7.5).text(munVal, xSubCol2, yItemsFila1 + gapItem + 8, { width: subColW });

    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6.5).text('Teléfono / Contacto:', xSubCol2, yItemsFila1 + gapItem * 2);
    doc.fillColor(AZUL_OSCURO).font('Helvetica').fontSize(7.5).text(telVal, xSubCol2, yItemsFila1 + gapItem * 2 + 8, { width: subColW });

    // Caja Derecha: Sello Oficial Circular
    doc.save();
    doc.roundedRect(xColDer, yFila1, anchoColDer, altoFila1, 6).lineWidth(0.8).strokeColor(GRIS_BORDE).stroke();

    const cx = xColDer + anchoColDer / 2;
    const cy = yFila1 + altoFila1 / 2;
    const r = 36;
    const fechaSello = new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    // undefined = sin resultado todavía: ni aprobado ni observado.
    const esAprobado: boolean | undefined = data.resultado ? data.resultado.aprueba : data.datosControlInterno?.esFavorable;
    const textoSello = esAprobado === undefined ? 'SIN VALIDAR' : esAprobado ? 'APROBADO Y VALIDADO' : 'NO APROBADO / OBSERVADO';
    const colorSello = esAprobado === undefined ? GRIS_CLARO : esAprobado ? AZUL_INSTITUCIONAL : ROJO_TXT;

    doc.circle(cx, cy, r).lineWidth(1.8).strokeColor(AZUL_INSTITUCIONAL).stroke();
    doc.circle(cx, cy, r - 2.5).lineWidth(0.6).strokeColor(AZUL_INSTITUCIONAL).stroke();
    doc.circle(cx, cy, r - 5.5).lineWidth(0.8).dash(3, { space: 2 }).strokeColor(AZUL_INSTITUCIONAL).stroke().undash();

    doc.moveTo(cx - 24, cy - 7).lineTo(cx + 24, cy - 7).lineWidth(0.6).strokeColor(AZUL_INSTITUCIONAL).stroke();
    doc.moveTo(cx - 24, cy + 6).lineTo(cx + 24, cy + 6).lineWidth(0.6).strokeColor(AZUL_INSTITUCIONAL).stroke();

    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(5).text('REPÚBLICA DOMINICANA', cx - 30, cy - 18, { width: 60, align: 'center' });
    doc.fillColor(colorSello).font('Helvetica-Bold').fontSize(esAprobado === true ? 6.5 : 5.8).text(textoSello, cx - 30, cy - 4.5, { width: 60, align: 'center' });
    doc.fillColor(GRIS_TEXTO).font('Helvetica-Bold').fontSize(5.5).text(fechaSello, cx - 30, cy + 9, { width: 60, align: 'center' });
    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica').fontSize(4.5).text('SINEC · DIGEMAPS / MSP', cx - 30, cy + 18, { width: 60, align: 'center' });
    doc.restore();

    // 3. SECCIÓN: DATOS DE CONTROL INTERNO Y FISCALIZACIÓN
    const yFila2 = yFila1 + altoFila1 + 7;
    const altoFila2 = 62;

    doc.save();
    doc.roundedRect(x, yFila2, anchoContenido, altoFila2, 6).lineWidth(0.8).strokeColor(GRIS_BORDE).stroke();
    doc.restore();

    doc
      .fillColor(AZUL_INSTITUCIONAL)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('DATOS DE CONTROL INTERNO Y FISCALIZACIÓN', x + 10, yFila2 + 7);

    const ctrl = data.datosControlInterno;
    const fechaIniVal = ctrl?.fechaInspeccionInicial || this.buscarMeta(data.metadata, ['Fecha Programada', 'Inicial']) || NA;
    const permisoVal = ctrl?.noPermisoSanitario || NA;
    const fechaActVal = ctrl?.fechaInspeccionActual || NA;
    const motivoVal = ctrl?.motivoInspeccion || this.buscarMeta(data.metadataControl, ['Tipo']) || NA;
    const tecVal = ctrl?.tecnicoEvaluador || data.tecnicoNombre || this.buscarMeta(data.metadata, ['Técnico', 'Evaluador']) || NA;
    const coordVal = ctrl?.coordinadorRevisor || data.coordinadorNombre || NA;
    const freqVal = ctrl?.frecuenciaFiscalizacion || data.resultado?.frecuencia || NA;
    const dictamenVal = ctrl?.dictamenTecnico || (esAprobado === undefined ? NA : esAprobado ? 'Favorable' : 'Desfavorable');

    const col4W = (anchoContenido - 20) / 4;
    const yCont2 = yFila2 + 20;

    // Columna 1
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text('Fecha Inspección Inicial:', x + 10, yCont2);
    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(7.5).text(fechaIniVal, x + 10, yCont2 + 7);
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text('Técnico Evaluador:', x + 10, yCont2 + 20);
    doc.fillColor(AZUL_OSCURO).font('Helvetica').fontSize(7.5).text(tecVal, x + 10, yCont2 + 27, { width: col4W - 5 });

    // Columna 2
    const xCol2 = x + 10 + col4W;
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text('No. Permiso Sanitario:', xCol2, yCont2);
    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(7.5).text(permisoVal, xCol2, yCont2 + 7);
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text('Coordinador Revisor:', xCol2, yCont2 + 20);
    doc.fillColor(AZUL_OSCURO).font('Helvetica').fontSize(7.5).text(coordVal, xCol2, yCont2 + 27, { width: col4W - 5 });

    // Columna 3
    const xCol3 = x + 10 + col4W * 2;
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text('Fecha Inspección Actual:', xCol3, yCont2);
    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(7.5).text(fechaActVal, xCol3, yCont2 + 7);
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text('Frecuencia Fiscalización:', xCol3, yCont2 + 20);
    doc.fillColor(AZUL_OSCURO).font('Helvetica').fontSize(7.5).text(freqVal, xCol3, yCont2 + 27, { width: col4W - 5 });

    // Columna 4
    const xCol4 = x + 10 + col4W * 3;
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text('Motivo de Inspección:', xCol4, yCont2);
    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(7.5).text(motivoVal, xCol4, yCont2 + 7);
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text('Dictamen Técnico:', xCol4, yCont2 + 20);

    // Pill badge Dictamen Técnico
    const dictamenBg = esAprobado === undefined ? '#F1F5F9' : esAprobado ? '#D1FAE5' : '#FEE2E2';
    const dictamenBorde = esAprobado === undefined ? '#E2E8F0' : esAprobado ? '#A7F3D0' : '#FECACA';
    const dictamenColor = esAprobado === undefined ? GRIS_TEXTO : esAprobado ? '#065F46' : '#991B1B';

    doc.save();
    doc.roundedRect(xCol4, yCont2 + 27, 60, 12, 6).fillAndStroke(dictamenBg, dictamenBorde);
    doc.fillColor(dictamenColor).font('Helvetica-Bold').fontSize(7).text(dictamenVal, xCol4, yCont2 + 29.5, { width: 60, align: 'center' });
    doc.restore();

    // 4. SECCIÓN: CUMPLIMIENTO BPM & RESULTADO DESTACADO
    const yFila3 = yFila2 + altoFila2 + 7;
    const altoFila3 = 64;

    doc.save();
    doc.roundedRect(x, yFila3, anchoContenido, altoFila3, 8).lineWidth(1.5).strokeColor(AZUL_INSTITUCIONAL).stroke();
    doc.restore();

    const res = data.resultado;

    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(9).text('CUMPLIMIENTO BPM:', x + 16, yFila3 + 12);
    const anchoLabel = doc.widthOfString('CUMPLIMIENTO BPM:');
    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(15).text(res ? `${res.cumplimientoPct.toFixed(0)}%` : NA, x + 16 + anchoLabel + 6, yFila3 + 7.5);

    const yBadges = yFila3 + 28;
    if (res) {
      // Badge 1: Críticas
      doc.save();
      doc.roundedRect(x + 16, yBadges, 64, 12, 6).fillAndStroke(VERDE_BG, VERDE_BORDE);
      doc.fillColor(VERDE_TXT).font('Helvetica-Bold').fontSize(6.5).text(`${res.ncCriticas} NC Crítica${res.ncCriticas === 1 ? '' : 's'}`, x + 16, yBadges + 2.5, { width: 64, align: 'center' });
      doc.restore();

      // Badge 2: Mayores
      doc.save();
      doc.roundedRect(x + 86, yBadges, 64, 12, 6).fillAndStroke(AMBAR_BG, AMBAR_BORDE);
      doc.fillColor(AMBAR_TXT).font('Helvetica-Bold').fontSize(6.5).text(`${res.ncMayores} NC Mayor${res.ncMayores === 1 ? '' : 'es'}`, x + 86, yBadges + 2.5, { width: 64, align: 'center' });
      doc.restore();

      // Badge 3: Menores
      doc.save();
      doc.roundedRect(x + 156, yBadges, 60, 12, 6).fillAndStroke('#F1F5F9', '#E2E8F0');
      doc.fillColor(GRIS_TEXTO).font('Helvetica-Bold').fontSize(6.5).text(`${res.ncMenores} NC Menor${res.ncMenores === 1 ? '' : 'es'}`, x + 156, yBadges + 2.5, { width: 60, align: 'center' });
      doc.restore();
    } else {
      doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(7).text('Sin resultado de evaluación registrado.', x + 16, yBadges + 2.5);
    }

    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(7.5).text('Nivel de Riesgo: ', x + 16, yFila3 + 46, { continued: true });
    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(7.5).text(res?.nivelRiesgo ?? NA);

    // Botón Derecho
    const btnW = 190;
    const btnH = 34;
    const btnX = x + anchoContenido - btnW - 16;
    const btnY = yFila3 + (altoFila3 - btnH) / 2;
    const btnColor = !res ? GRIS_CLARO : res.aprueba ? AZUL_INSTITUCIONAL : ROJO_TXT;
    const btnTexto = !res ? 'RESULTADO PENDIENTE' : res.aprueba ? 'PERMISO SANITARIO APROBADO' : 'PERMISO SANITARIO NO APROBADO';

    doc.save();
    doc.roundedRect(btnX, btnY, btnW, btnH, 6).fill(btnColor);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5).text(btnTexto, btnX, btnY + 11.5, { width: btnW, align: 'center' });
    doc.restore();

    // 5. SECCIÓN: DETALLE DE NO CONFORMIDADES DETECTADAS
    const yFila4 = yFila3 + altoFila3 + 9;
    const ncs = data.noConformidades || [];
    const countNcTxt = `${ncs.length} OBSERVACIÓ${ncs.length === 1 ? 'N TÉCNICA REGISTRADA' : 'NES TÉCNICAS REGISTRADAS'}`;

    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(8).text('DETALLE DE NO CONFORMIDADES DETECTADAS', x, yFila4);
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(7).text(countNcTxt, x, yFila4 + 1, { width: anchoContenido, align: 'right' });

    const yTabla = yFila4 + 11;
    const colItemW = 175;
    const colGravW = 58;
    const colCalifW = 82;
    const colObsW = anchoContenido - colItemW - colGravW - colCalifW; // 225

    doc.save();
    doc.roundedRect(x, yTabla, anchoContenido, 16, 4).fillAndStroke(GRIS_FONDO, GRIS_BORDE);
    doc.restore();

    doc.fillColor(GRIS_TEXTO).font('Helvetica-Bold').fontSize(7);
    doc.text('Ítem evaluado', x + 8, yTabla + 4.5, { width: colItemW });
    doc.text('Gravedad', x + colItemW + 8, yTabla + 4.5, { width: colGravW });
    doc.text('Calificación', x + colItemW + colGravW + 8, yTabla + 4.5, { width: colCalifW });
    doc.text('Observación del Técnico', x + colItemW + colGravW + colCalifW + 8, yTabla + 4.5, { width: colObsW });

    let currY = yTabla + 16;

    if (ncs.length === 0) {
      const altoRow = 24;
      doc.save();
      doc.rect(x, currY, anchoContenido, altoRow).lineWidth(0.5).strokeColor(GRIS_BORDE).stroke();
      doc.restore();
      // Solo se afirma que cumple si hay un resultado calculado; sin él no hay nada que afirmar.
      const mensajeSinNc = data.resultado
        ? 'No se detectaron no conformidades durante la inspección técnica. El establecimiento cumple satisfactoriamente con los estándares BPM.'
        : 'Sin resultados de evaluación registrados: no hay no conformidades que mostrar.';
      doc.fillColor(data.resultado ? '#065F46' : GRIS_CLARO).font('Helvetica').fontSize(7.5).text(mensajeSinNc, x + 10, currY + 7, { width: anchoContenido - 20, align: 'center' });
      currY += altoRow;
    } else {
      for (const f of ncs) {
        doc.fontSize(6.8).font('Helvetica');
        const altoObs = doc.heightOfString(f.observacion || NA, { width: colObsW - 10 });
        doc.fontSize(7).font('Helvetica-Bold');
        const altoItem = doc.heightOfString(f.item, { width: colItemW - 10 });
        const altoRow = Math.max(altoObs, altoItem, 14) + 8;

        // Comprobar si cabe en página actual
        if (currY + altoRow > doc.page.height - 130) {
          doc.addPage();
          currY = doc.page.margins.top + 10;
        }

        doc.save();
        doc.rect(x, currY, anchoContenido, altoRow).lineWidth(0.5).strokeColor(GRIS_BORDE).stroke();
        doc.restore();

        doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(7).text(f.item, x + 8, currY + 4, { width: colItemW - 10 });

        const pillColor = f.gravedad === 'CRITICA' ? ROJO_BG : (f.gravedad === 'MAYOR' ? AMBAR_BG : '#F1F5F9');
        const pillBorder = f.gravedad === 'CRITICA' ? ROJO_BORDE : (f.gravedad === 'MAYOR' ? AMBAR_BORDE : '#CBD5E1');
        const pillText = f.gravedad === 'CRITICA' ? ROJO_TXT : (f.gravedad === 'MAYOR' ? AMBAR_TXT : GRIS_TEXTO);

        doc.save();
        doc.roundedRect(x + colItemW + 8, currY + 3.5, 46, 11, 5).fillAndStroke(pillColor, pillBorder);
        doc.fillColor(pillText).font('Helvetica-Bold').fontSize(6).text(f.gravedad, x + colItemW + 8, currY + 5.5, { width: 46, align: 'center' });
        doc.restore();

        doc.fillColor(GRIS_TEXTO).font('Helvetica').fontSize(7).text(f.calificacion, x + colItemW + colGravW + 8, currY + 4, { width: colCalifW });
        doc.fillColor(AZUL_OSCURO).font('Helvetica').fontSize(6.8).text(f.observacion || NA, x + colItemW + colGravW + colCalifW + 8, currY + 4, { width: colObsW - 10 });

        currY += altoRow;
      }
    }

    // 6. SECCIÓN: VALIDACIÓN DIGITAL QR, FIRMA Y CERTIFICACIÓN
    if (currY + 90 > doc.page.height - 50) {
      doc.addPage();
      currY = doc.page.margins.top + 10;
    }

    const yFila5 = currY + 10;
    doc.moveTo(x, yFila5).lineTo(x + anchoContenido, yFila5).lineWidth(1.5).strokeColor(AZUL_INSTITUCIONAL).stroke();

    const colFirmasW = (anchoContenido - 20) / 3;
    const yFirmasCont = yFila5 + 8;
    const altoFirmasBox = 56;

    // Columna 1: QR Real
    doc.save();
    doc.roundedRect(x, yFirmasCont, colFirmasW, altoFirmasBox, 6).fillAndStroke(GRIS_FONDO, GRIS_BORDE);
    doc.restore();

    const qrTam = 42;
    if (qrBuffer) {
      doc.image(qrBuffer, x + 6, yFirmasCont + 7, { fit: [qrTam, qrTam] });
    }

    const xQrTxt = x + qrTam + 12;
    const wQrTxt = colFirmasW - qrTam - 16;
    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(7.5).text('Validación Digital QR', xQrTxt, yFirmasCont + 6);
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(5.5).text('Escanee con la cámara de su teléfono para verificar la autenticidad en el servidor de DIGEMAPS.', xQrTxt, doc.y + 2, { width: wQrTxt });
    doc.fillColor(AZUL_MEDIO).font('Helvetica-Bold').fontSize(6).text(`ID: ${data.codigo || NA}`, xQrTxt, doc.y + 3);

    // Columna 2: Firma Manuscrita Técnico
    const xFirmaCol = x + colFirmasW + 10;
    const firmaPath = this.rutaFirma();

    if (data.incluirFirma !== false && firmaPath) {
      try {
        doc.image(firmaPath, xFirmaCol + (colFirmasW - 75) / 2, yFirmasCont + 2, { fit: [75, 26] });
      } catch {
        // Ignorar si no carga imagen
      }
    }

    const yLineaFirma = yFirmasCont + 30;
    doc.save();
    doc.moveTo(xFirmaCol + 15, yLineaFirma).lineTo(xFirmaCol + colFirmasW - 15, yLineaFirma).lineWidth(0.6).strokeColor(GRIS_BORDE).stroke();
    doc.restore();

    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(7.5).text(data.tecnicoNombre || NA, xFirmaCol, yLineaFirma + 3, { width: colFirmasW, align: 'center' });
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text(data.tecnicoCargo || 'Técnico Evaluador Autorizado', xFirmaCol, doc.y + 1, { width: colFirmasW, align: 'center' });
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(5.5).text(data.tecnicoRegistro || NA, xFirmaCol, doc.y + 1, { width: colFirmasW, align: 'center' });

    // Columna 3: Firma Electrónica Coordinador
    const xCoordCol = x + (colFirmasW + 10) * 2;
    const firmadoPorCoordinador = Boolean(data.coordinadorNombre);
    doc.fillColor(firmadoPorCoordinador ? AZUL_INSTITUCIONAL : GRIS_CLARO).font('Helvetica-Bold').fontSize(7.5).text(firmadoPorCoordinador ? 'FIRMADO DIGITALMENTE' : 'PENDIENTE DE FIRMA', xCoordCol, yFirmasCont + 8, { width: colFirmasW, align: 'center' });
    if (firmadoPorCoordinador) doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(5.5).text('Cert: MSP-DIGEMAPS-2026', xCoordCol, doc.y + 2, { width: colFirmasW, align: 'center' });

    doc.save();
    doc.moveTo(xCoordCol + 15, yLineaFirma).lineTo(xCoordCol + colFirmasW - 15, yLineaFirma).lineWidth(0.6).strokeColor(GRIS_BORDE).stroke();
    doc.restore();

    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(7.5).text(data.coordinadorNombre || NA, xCoordCol, yLineaFirma + 3, { width: colFirmasW, align: 'center' });
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text(data.coordinadorCargo || 'Coordinador Técnico DIGEMAPS', xCoordCol, doc.y + 1, { width: colFirmasW, align: 'center' });
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(5.5).text((firmadoPorCoordinador ? data.coordinadorCertificado || 'Firma Electrónica Avanzada (Ley 126-02)' : ' '), xCoordCol, doc.y + 1, { width: colFirmasW, align: 'center' });

    // 7. PIE DE PÁGINA DOCUMENTAL INSTITUCIONAL
    const yFooter = Math.max(yFirmasCont + altoFirmasBox + 16, 560);
    doc.save();
    doc.moveTo(x, yFooter - 6).lineTo(x + anchoContenido, yFooter - 6).lineWidth(0.5).strokeColor(GRIS_BORDE).stroke();
    doc.restore();

    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text('Este documento constituye el informe técnico oficial de evaluación sanitaria emitido por el Sistema SINEC conforme a la Norma NORDOM BPM y DIGEMAPS.', x, yFooter, { width: anchoContenido, align: 'center' });
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(5.5).text(`Hash de Integridad SHA-256 (contenido del documento): ${this.calcularHashContenido(data)}`, x, doc.y + 2, { width: anchoContenido, align: 'center' });
  }

  // ===========================================================================
  // RENDERIZADOR 2: DOCUMENTO GENÉRICO / EXPEDIENTES CON PÁGINAS MÚLTIPLES
  // ===========================================================================
  private renderizarDocumentoGenerico(
    doc: PDFKit.PDFDocument,
    data: DocumentoPdfData,
    qrBuffer: Buffer | null,
  ) {
    this.dibujarEncabezadoGenerico(doc, data);

    const tituloMetadata = data.metadataTitulo ?? 'DATOS GENERALES';
    if (data.metadata && data.metadata.length > 0) {
      this.dibujarGrillaGenerica(doc, tituloMetadata, data.metadata);
    }

    if (data.metadataControl && data.metadataControl.length > 0) {
      this.dibujarGrillaGenerica(doc, data.metadataControlTitulo ?? 'DATOS DE CONTROL INTERNO', data.metadataControl);
    }

    if (data.resultado) {
      this.dibujarResultadoDestacadoGenerico(doc, data.resultado);
    }

    if (data.noConformidades && data.noConformidades.length > 0) {
      this.dibujarTablaNoConformidadesGenerica(doc, data.noConformidades);
    }

    if (data.secciones) {
      for (const seccion of data.secciones) {
        this.dibujarSeccionGenerica(doc, seccion);
      }
    }

    if (data.incluirFirma || data.incluirQr || data.qrUrl || data.incluirSello) {
      this.dibujarBloqueFirmasYQrGenerico(doc, data, qrBuffer);
    }

    this.dibujarPiePaginaEnTodas(doc);
  }

  private asegurarEspacio(doc: PDFKit.PDFDocument, altoNecesario: number) {
    const limiteInferior = doc.page.height - doc.page.margins.bottom;
    if (doc.y + altoNecesario > limiteInferior) {
      doc.addPage();
    }
  }

  private anchoContenido(doc: PDFKit.PDFDocument): number {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  private dibujarEncabezadoGenerico(doc: PDFKit.PDFDocument, data: DocumentoPdfData) {
    const x = doc.page.margins.left;
    const ancho = this.anchoContenido(doc);
    const yInicio = doc.y;
    const logo = this.rutaLogo();
    const logoTam = 40;
    const textoX = x + logoTam + 12;

    if (logo) {
      try {
        doc.image(logo, x, yInicio, { fit: [logoTam, logoTam] });
      } catch (err) {
        this.logger.warn(`No se pudo embeber el logo: ${err}`);
        this.dibujarLogoPlaceholder(doc, x, yInicio, logoTam, logoTam);
      }
    } else {
      this.dibujarLogoPlaceholder(doc, x, yInicio, logoTam, logoTam);
    }

    const anchoTitulo = ancho - logoTam - 12;
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
      .text(lineasDerecha, x, doc.y, { width: ancho, align: 'right' });

    doc.y += 4;
    doc
      .moveTo(x, doc.y)
      .lineTo(x + ancho, doc.y)
      .lineWidth(2)
      .strokeColor(AZUL_INSTITUCIONAL)
      .stroke();
    doc.y += 16;
    doc.x = x;
  }

  private dibujarGrillaGenerica(doc: PDFKit.PDFDocument, titulo: string, items: MetadatoPdf[]) {
    const x = doc.page.margins.left;
    const ancho = this.anchoContenido(doc);
    const filas = Math.ceil(items.length / 2);
    const altoFila = 20;
    const altoCaja = filas * altoFila + 16;

    this.asegurarEspacio(doc, altoCaja + 24);

    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(10).text(titulo, x, doc.y);
    doc.y += 14;

    const cajaY = doc.y;
    doc.save();
    doc.rect(x, cajaY, ancho, altoCaja).fill(GRIS_FONDO);
    doc.rect(x, cajaY, ancho, altoCaja).lineWidth(1).stroke(GRIS_BORDE);
    doc.restore();

    const colAncho = ancho / 2;
    for (let i = 0; i < items.length; i++) {
      const fila = Math.floor(i / 2);
      const col = i % 2;
      const itemX = x + 10 + col * colAncho;
      const itemY = cajaY + 10 + fila * altoFila;

      doc
        .fillColor(GRIS_TEXTO)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(`${items[i].etiqueta}:`, itemX, itemY, { width: colAncho - 100 });
      doc
        .fillColor(AZUL_OSCURO)
        .font('Helvetica')
        .fontSize(8.5)
        .text(items[i].valor || 'N/A', itemX + 120, itemY, { width: colAncho - 130 });
    }

    doc.y = cajaY + altoCaja + 20;
    doc.x = x;
  }

  private dibujarResultadoDestacadoGenerico(doc: PDFKit.PDFDocument, resultado: ResultadoDestacadoPdf) {
    const x = doc.page.margins.left;
    const ancho = this.anchoContenido(doc);
    const altoCaja = 90;

    this.asegurarEspacio(doc, altoCaja + 20);
    const cajaY = doc.y;

    const colorAprueba = resultado.aprueba ? VERDE_APRUEBA : ROJO_NO_APRUEBA;

    doc.save();
    doc.rect(x, cajaY, ancho, altoCaja).fill('#FFFFFF');
    doc.rect(x, cajaY, ancho, altoCaja).lineWidth(1).stroke(GRIS_BORDE);
    doc.rect(x, cajaY, 4, altoCaja).fill(colorAprueba);
    doc.restore();

    const col1X = x + 20;
    doc.fillColor(GRIS_CLARO).font('Helvetica-Bold').fontSize(8).text('CUMPLIMIENTO BPM', col1X, cajaY + 14, { width: 130 });
    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(28).text(`${resultado.cumplimientoPct.toFixed(1)}%`, col1X, cajaY + 26, { width: 130 });

    const col2X = x + 190;
    doc.fillColor(GRIS_CLARO).font('Helvetica-Bold').fontSize(8).text('NO CONFORMIDADES', col2X, cajaY + 14, { width: 220 });
    doc.fillColor(GRIS_TEXTO).font('Helvetica').fontSize(9).text(
      `Críticas: ${resultado.ncCriticas}   Mayores: ${resultado.ncMayores}   Menores: ${resultado.ncMenores}`,
      col2X,
      cajaY + 27,
      { width: 260 },
    );
    doc.fillColor(GRIS_TEXTO).font('Helvetica').fontSize(9).text(
      `Nivel de riesgo: ${resultado.nivelRiesgo}` + (resultado.frecuencia ? `   ·   Frecuencia: ${resultado.frecuencia}` : ''),
      col2X,
      cajaY + 42,
      { width: 300 },
    );

    const col3Ancho = 140;
    const col3X = x + ancho - col3Ancho - 15;
    doc.fillColor(colorAprueba).font('Helvetica-Bold').fontSize(20).text(
      resultado.aprueba ? 'APRUEBA' : 'NO APRUEBA',
      col3X,
      cajaY + 32,
      { width: col3Ancho, align: 'right' },
    );

    doc.y = cajaY + altoCaja + 20;
    doc.x = x;
  }

  private dibujarTablaNoConformidadesGenerica(doc: PDFKit.PDFDocument, filas: FilaNoConformidad[]) {
    const x = doc.page.margins.left;
    const ancho = this.anchoContenido(doc);

    const colItem = ancho * 0.3;
    const colGravedad = ancho * 0.14;
    const colCalificacion = ancho * 0.16;
    const colObservacion = ancho * 0.4;

    this.asegurarEspacio(doc, 40);
    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(10).text('NO CONFORMIDADES DETECTADAS', x, doc.y);
    doc.y += 14;

    const dibujarEncabezadoTabla = () => {
      const filaY = doc.y;
      doc.save();
      doc.rect(x, filaY, ancho, 20).fill(GRIS_FONDO);
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
      doc.fontSize(8.5).font('Helvetica');
      const altoObservacion = doc.heightOfString(fila.observacion || 'N/A', { width: colObservacion - 10 });
      const altoItem = doc.heightOfString(fila.item, { width: colItem - 10 });
      const altoFila = Math.max(altoObservacion, altoItem, 16) + 10;

      this.asegurarEspacio(doc, altoFila + 20);
      if (doc.y === doc.page.margins.top) {
        dibujarEncabezadoTabla();
      }

      const filaY = doc.y;
      doc.save();
      doc.rect(x, filaY, ancho, altoFila).lineWidth(0.5).stroke(GRIS_BORDE);
      doc.restore();

      doc.fillColor(GRIS_TEXTO).font('Helvetica').fontSize(8.5);
      doc.text(fila.item, x + 6, filaY + 6, { width: colItem - 6 });

      const colorGravedad = COLOR_GRAVEDAD[fila.gravedad] || '#64748B';
      const pillAncho = 52;
      const pillX = x + colItem + (colGravedad - pillAncho) / 2;
      doc.save();
      doc.roundedRect(pillX, filaY + 4, pillAncho, 14, 7).fill(colorGravedad);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(ETIQUETA_GRAVEDAD[fila.gravedad] || fila.gravedad, pillX, filaY + 7.5, { width: pillAncho, align: 'center' });
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

  private dibujarSeccionGenerica(doc: PDFKit.PDFDocument, seccion: SeccionPdf) {
    const x = doc.page.margins.left;
    const ancho = this.anchoContenido(doc);
    const texto = this.normalizarTextoSeccion(seccion.contenido);
    const esEstadoVacio = texto === 'Sin información registrada.';

    const anchoTexto = ancho - 20;
    doc.font('Helvetica').fontSize(9.5);
    const altoTexto = doc.heightOfString(texto, { width: anchoTexto });
    const altoCaja = altoTexto + 24;

    this.asegurarEspacio(doc, altoCaja + 34);

    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(10.5).text(seccion.titulo, x, doc.y);
    doc.y += 14;

    const cajaY = doc.y;
    doc.save();
    doc.rect(x, cajaY, ancho, altoCaja).fill(esEstadoVacio ? '#FAFAFA' : '#FFFFFF');
    doc.rect(x, cajaY, 2, altoCaja).fill(GRIS_BORDE);
    doc.rect(x, cajaY, ancho, altoCaja).lineWidth(1).stroke(GRIS_BORDE);
    doc.restore();

    doc.fillColor(esEstadoVacio ? GRIS_CLARO : GRIS_TEXTO).font('Helvetica').fontSize(9.5).text(texto, x + 10, cajaY + 10, { width: anchoTexto });

    doc.y = cajaY + altoCaja + 16;
    doc.x = x;
  }

  private normalizarTextoSeccion(contenido: string): string {
    if (!contenido || !contenido.trim() || contenido.trim() === 'N/A' || contenido.startsWith('Sin ')) {
      return 'Sin información registrada.';
    }
    return contenido.trim();
  }

  private dibujarSelloCertificacionGenerico(doc: PDFKit.PDFDocument, cx: number, cy: number, fechaStr: string) {
    const r = 30;
    doc.save();
    doc.circle(cx, cy, r).lineWidth(1.8).strokeColor(AZUL_INSTITUCIONAL).stroke();
    doc.circle(cx, cy, r - 2.5).lineWidth(0.8).strokeColor(AZUL_INSTITUCIONAL).stroke();
    doc.circle(cx, cy, r - 5.5).lineWidth(0.8).dash(3, { space: 2 }).strokeColor(AZUL_INSTITUCIONAL).stroke().undash();

    doc.moveTo(cx - 20, cy - 5).lineTo(cx + 20, cy - 5).lineWidth(0.6).strokeColor(AZUL_INSTITUCIONAL).stroke();
    doc.moveTo(cx - 20, cy + 6).lineTo(cx + 20, cy + 6).lineWidth(0.6).strokeColor(AZUL_INSTITUCIONAL).stroke();

    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(5).text('REPÚBLICA DOMINICANA', cx - 28, cy - 18, { width: 56, align: 'center' });
    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(6).text('APROBADO Y VALIDADO', cx - 28, cy - 3.5, { width: 56, align: 'center' });
    doc.fillColor(GRIS_TEXTO).font('Helvetica-Bold').fontSize(5).text(fechaStr, cx - 24, cy + 8, { width: 48, align: 'center' });
    doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica').fontSize(4.5).text('SINEC · DIGEMAPS', cx - 26, cy + 18, { width: 52, align: 'center' });
    doc.restore();
  }

  private dibujarBloqueFirmasYQrGenerico(doc: PDFKit.PDFDocument, data: DocumentoPdfData, qrBuffer: Buffer | null) {
    const altoBloque = 100;
    this.asegurarEspacio(doc, altoBloque + 20);

    const x = doc.page.margins.left;
    const ancho = this.anchoContenido(doc);
    const yInicio = doc.y + 6;

    doc.save();
    doc.moveTo(x, yInicio).lineTo(x + ancho, yInicio).lineWidth(1.5).strokeColor(AZUL_INSTITUCIONAL).stroke();
    doc.restore();

    const yContenido = yInicio + 10;
    const colAncho = ancho / 3;

    // Columna 1: QR
    const col1X = x;
    if (qrBuffer) {
      try {
        const qrTam = 56;
        doc.image(qrBuffer, col1X, yContenido, { fit: [qrTam, qrTam] });
        const textoQrX = col1X + qrTam + 6;
        const textoQrAncho = colAncho - qrTam - 10;

        doc.fillColor(AZUL_INSTITUCIONAL).font('Helvetica-Bold').fontSize(7.5).text('Validación QR', textoQrX, yContenido + 2, { width: textoQrAncho });
        doc.fillColor(GRIS_TEXTO).font('Helvetica').fontSize(6).text('Escanee con la cámara para verificar autenticidad en SINEC / DIGEMAPS.', textoQrX, doc.y + 2, { width: textoQrAncho });
        if (data.codigo) {
          doc.fillColor(GRIS_CLARO).font('Helvetica-Bold').fontSize(6).text(`ID: ${data.codigo}`, textoQrX, doc.y + 2, { width: textoQrAncho });
        }
      } catch (err) {
        this.logger.warn(`No se pudo embeber el QR en el PDF: ${err}`);
      }
    }

    // Columna 2: Firma Técnico
    const col2X = x + colAncho + 5;
    const col2Ancho = colAncho - 10;
    const firma = this.rutaFirma();
    const altoFirma = 36;
    const yFirma = yContenido;

    if (data.incluirFirma && firma) {
      try {
        doc.image(firma, col2X + (col2Ancho - 90) / 2, yFirma, { fit: [90, altoFirma] });
      } catch (err) {
        this.logger.warn(`No se pudo embeber la firma manuscrita: ${err}`);
      }
    }

    const yLineaFirma = yFirma + altoFirma + 4;
    doc.save();
    doc.moveTo(col2X + 10, yLineaFirma).lineTo(col2X + col2Ancho - 10, yLineaFirma).lineWidth(0.8).strokeColor(GRIS_BORDE).stroke();
    doc.restore();

    doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(8).text(data.tecnicoNombre ?? NA, col2X, yLineaFirma + 4, { width: col2Ancho, align: 'center' });
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6.5).text(data.tecnicoCargo ?? 'Técnico Evaluador Autorizado BPM', col2X, doc.y + 1, { width: col2Ancho, align: 'center' });
    doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(5.5).text(data.tecnicoRegistro ?? NA, col2X, doc.y + 1, { width: col2Ancho, align: 'center' });

    // Columna 3: Firma / Sello Coordinador
    const col3X = x + colAncho * 2 + 5;
    const col3Ancho = colAncho - 10;
    const fechaHoy = data.fechaEmision ?? new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

    if (data.incluirSello) {
      const stampCenterX = col3X + col3Ancho / 2;
      const stampCenterY = yContenido + 28;
      this.dibujarSelloCertificacionGenerico(doc, stampCenterX, stampCenterY, fechaHoy);

      doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(7.5).text(data.coordinadorNombre ?? NA, col3X, stampCenterY + 34, { width: col3Ancho, align: 'center' });
      doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text(data.coordinadorCargo ?? 'Coordinador Técnico DIGEMAPS', col3X, doc.y + 1, { width: col3Ancho, align: 'center' });
    } else {
      const yCoord = yContenido + 8;
      const firmado = Boolean(data.coordinadorNombre);
      doc.fillColor(firmado ? AZUL_INSTITUCIONAL : GRIS_CLARO).font('Helvetica-Bold').fontSize(8).text(firmado ? 'FIRMADO DIGITALMENTE' : 'PENDIENTE DE FIRMA', col3X, yCoord, { width: col3Ancho, align: 'center' });
      if (firmado) doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6).text('Certificado: MSP-DIGEMAPS-2026', col3X, doc.y + 1, { width: col3Ancho, align: 'center' });

      doc.save();
      doc.moveTo(col3X + 10, yLineaFirma).lineTo(col3X + col3Ancho - 10, yLineaFirma).lineWidth(0.8).strokeColor(GRIS_BORDE).stroke();
      doc.restore();

      doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(8).text(data.coordinadorNombre ?? NA, col3X, yLineaFirma + 4, { width: col3Ancho, align: 'center' });
      doc.fillColor(GRIS_CLARO).font('Helvetica').fontSize(6.5).text(data.coordinadorCargo ?? 'Coordinador Técnico DIGEMAPS', col3X, doc.y + 1, { width: col3Ancho, align: 'center' });
    }

    doc.y = yInicio + altoBloque + 10;
    doc.x = x;
  }

  private dibujarPiePaginaEnTodas(doc: PDFKit.PDFDocument) {
    const rango = doc.bufferedPageRange();
    const fechaHoy = new Date().toISOString().split('T')[0];

    for (let i = rango.start; i < rango.start + rango.count; i++) {
      doc.switchToPage(i);
      const x = doc.page.margins.left;
      const ancho = this.anchoContenido(doc);
      const y = doc.page.height - doc.page.margins.bottom + 12;

      doc.save();
      doc.moveTo(x, y - 6).lineTo(x + ancho, y - 6).lineWidth(0.5).strokeColor(GRIS_BORDE).stroke();
      doc
        .fillColor(GRIS_CLARO)
        .font('Helvetica')
        .fontSize(7.5)
        .text('DIGEMAPS | Sistema SINEC - Evaluación Basada en Riesgo (BPM) | Documento oficial', x, y, {
          width: ancho - 100,
        });
      doc
        .fillColor(GRIS_CLARO)
        .font('Helvetica')
        .fontSize(7.5)
        .text(`${fechaHoy}  ·  Página ${i - rango.start + 1} de ${rango.count}`, x, y, {
          width: ancho,
          align: 'right',
        });
      doc.restore();
    }
  }

  private dibujarLogoPlaceholder(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
    doc.save();
    doc.roundedRect(x, y, w, h, 6).fill(AZUL_INSTITUCIONAL);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14).text('SINEC', x, y + 14, { width: w, align: 'center' });
    doc.restore();
  }

  private buscarMeta(metadata: MetadatoPdf[] | undefined, palabrasClave: string[]): string | undefined {
    if (!metadata) return undefined;
    for (const m of metadata) {
      for (const p of palabrasClave) {
        if (m.etiqueta.toLowerCase().includes(p.toLowerCase())) {
          return m.valor;
        }
      }
    }
    return undefined;
  }
}
