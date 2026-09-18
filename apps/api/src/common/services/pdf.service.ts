import { Injectable } from '@nestjs/common';

export interface SeccionPdf {
  titulo: string;
  contenido: string;
}

export interface MetadatoPdf {
  etiqueta: string;
  valor: string;
}

export interface DocumentoPdfData {
  titulo: string;
  subtitulo?: string;
  metadata: MetadatoPdf[];
  secciones: SeccionPdf[];
}

@Injectable()
export class PdfService {
  generarDocumentoPdf(doc: DocumentoPdfData): Buffer {
    const lineas: string[] = [];

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
    lineas.push('(REPÚBLICA DOMINICANA | MINISTERIO DE SALUD PÚBLICA - DIGEMAPS) Tj');
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
      lineas.push('(Sistema de Evaluación Basada en Riesgo - EBR/BPM) Tj');
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
    lineas.push('(DIGEMAPS | Sistema de Evaluación Basada en Riesgo - EBR/BPM) Tj');
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
  }

  private renderMetadatoItem(lineas: string[], item: MetadatoPdf, labelX: number, valueX: number, rowY: number) {
    lineas.push('BT');
    lineas.push('/F2 8.5 Tf');
    lineas.push('0.30 0.35 0.45 rg'); // Etiqueta gris azulado #475569
    lineas.push(`${labelX} ${rowY} Td`);
    lineas.push(`(${this.escapePdfText(item.etiqueta)}:) Tj`);
    lineas.push('ET');

    const esDestacado =
      item.etiqueta.includes('Estado') ||
      item.etiqueta.includes('Calificacion') ||
      item.etiqueta.includes('Resultado');

    if (esDestacado) {
      // Badge sutil verde/azul para resaltar el valor del estado/calificación
      const esPositivo =
        item.valor.includes('Aprobada') ||
        item.valor.includes('Cerrado') ||
        item.valor.includes('Bajo') ||
        item.valor.includes('Satisfactorio') ||
        item.valor.includes('Aprueba');

      lineas.push('q');
      if (esPositivo) {
        lineas.push('0.92 0.98 0.95 rg'); // Fondo verde sutil #ECFDF5
      } else {
        lineas.push('0.94 0.96 1.0 rg'); // Fondo azul sutil #EFF6FF
      }
      const anchoBadge = Math.min(item.valor.length * 5 + 10, 150);
      lineas.push(`${valueX - 3} ${rowY - 2} ${anchoBadge} 12 re f`);
      lineas.push('Q');

      lineas.push('BT');
      lineas.push('/F2 8.5 Tf');
      if (esPositivo) {
        lineas.push('0.02 0.37 0.27 rg'); // Texto verde oscuro #065F46
      } else {
        lineas.push('0.12 0.25 0.69 rg'); // Texto azul #1E40AF
      }
      lineas.push(`${valueX} ${rowY} Td`);
      lineas.push(`(${this.escapePdfText(item.valor)}) Tj`);
      lineas.push('ET');
    } else {
      lineas.push('BT');
      lineas.push('/F1 8.5 Tf');
      lineas.push('0.06 0.09 0.16 rg'); // Texto negro corporativo
      lineas.push(`${valueX} ${rowY} Td`);
      lineas.push(`(${this.escapePdfText(item.valor)}) Tj`);
      lineas.push('ET');
    }
  }

  private normalizarTextoSeccion(contenido: string): string {
    if (!contenido || !contenido.trim() || contenido.trim() === 'N/A' || contenido.startsWith('Sin ')) {
      return 'Sin información registrada.';
    }
    return contenido.trim();
  }

  private escapePdfText(str: string): string {
    if (!str) return '';

    const escapado = str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

    const mapaWinAnsi: Record<string, string> = {
      'á': '\\341', 'é': '\\351', 'í': '\\355', 'ó': '\\363', 'ú': '\\372',
      'Á': '\\301', 'É': '\\311', 'Í': '\\315', 'Ó': '\\323', 'Ú': '\\332',
      'ñ': '\\361', 'Ñ': '\\321',
      'ü': '\\374', 'Ü': '\\334',
      '¿': '\\277', '¡': '\\241',
    };

    return escapado.replace(/[áéíóúÁÉÍÓÚñÑüÜ¿¡]/g, (m) => mapaWinAnsi[m] ?? m);
  }

  private wrapText(text: string, maxCharsPerLine: number): string[] {
    if (!text) return ['Sin información registrada.'];
    const result: string[] = [];
    const paragraphs = text.split('\n');

    for (const p of paragraphs) {
      if (!p.trim()) continue;
      const words = p.split(' ');
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) result.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) result.push(currentLine);
    }
    return result.length > 0 ? result : ['Sin información registrada.'];
  }

  private ensamblarPdfBuffer(streamContent: string): Buffer {
    const streamBuffer = Buffer.from(streamContent, 'utf-8');
    const streamLength = streamBuffer.length;

    const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const obj2 = '2 0 obj\n<< /Type /Pages /Kids [5 0 R] /Count 1 >>\nendobj\n';
    const obj3 = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n';
    const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n';
    const obj5 = `5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>\nendobj\n`;
    const obj6Header = `6 0 obj\n<< /Length ${streamLength} >>\nstream\n`;
    const obj6Footer = `\nendstream\nendobj\n`;

    const header = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';

    const parts = [
      Buffer.from(header, 'binary'),
      Buffer.from(obj1, 'utf-8'),
      Buffer.from(obj2, 'utf-8'),
      Buffer.from(obj3, 'utf-8'),
      Buffer.from(obj4, 'utf-8'),
      Buffer.from(obj5, 'utf-8'),
      Buffer.from(obj6Header, 'utf-8'),
      streamBuffer,
      Buffer.from(obj6Footer, 'utf-8'),
    ];

    let offset = 0;
    const offsets: number[] = [0];

    for (let i = 0; i < parts.length; i++) {
      if (i === 1) offsets[1] = offset;
      if (i === 2) offsets[2] = offset;
      if (i === 3) offsets[3] = offset;
      if (i === 4) offsets[4] = offset;
      if (i === 5) offsets[5] = offset;
      if (i === 6) offsets[6] = offset;
      offset += parts[i].length;
    }

    const startXref = offset;
    let xref = `xref\n0 7\n0000000000 65535 f \n`;
    for (let i = 1; i <= 6; i++) {
      xref += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    parts.push(Buffer.from(xref, 'utf-8'));
    parts.push(Buffer.from(trailer, 'utf-8'));

    return Buffer.concat(parts);
  }
}
