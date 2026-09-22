/**
 * Generador de Acta PDF (Implementación Original y Nativa)
 * Utiliza el API nativa del navegador (window.print) para asegurar compatibilidad
 * sin dependencias externas y un peso mínimo en el bundle.
 */
import logo from '@/assets/logo-completo.png';

function generarHtmlOriginal(caso: any): string {
  // 1. Extracción y validación de datos
  const numeroExpediente = `SINEC-${String(caso.id || 0).padStart(6, '0')}`;
  const fechaReporte = new Date().toLocaleDateString('es-DO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  
  const establecimiento = caso.establecimiento?.nombre || 'No registrado';
  const direccion = caso.establecimiento?.calle || 'Dirección no especificada';
  const empresa = caso.establecimiento?.empresa?.razonSocial || 'No registrada';
  const rnc = caso.establecimiento?.empresa?.rnc || 'N/A';
  
  const evaluador = caso.asignaciones?.[0]?.evaluador?.nombreCompleto || 'Pendiente de asignación';
  const origen = caso.origen?.nombre || 'Inspección de Rutina';
  
  const evaluaciones = caso.evaluaciones || [];
  const ultimaEvaluacion = evaluaciones.length > 0 ? evaluaciones[evaluaciones.length - 1] : null;
  const tieneEvaluacion = !!ultimaEvaluacion;
  const estaCerrado = caso.estado === 'Cerrado' || ultimaEvaluacion?.estado?.codigo === 'CERRADA' || ultimaEvaluacion?.estado?.codigo === 'FINALIZADA';

  // Leer cálculo de riesgo (o parsear del resultado final del expediente para casos históricos antiguos de prueba)
  const calculoRiesgo = ultimaEvaluacion?.calculoRiesgo;
  let nivelRiesgo = calculoRiesgo?.nivelRiesgo?.codigo;
  let cumplimiento = calculoRiesgo?.porcentajeCumplimiento != null 
    ? `${Number(calculoRiesgo.porcentajeCumplimiento).toFixed(2)}%` 
    : null;

  // Respaldo (Fallback) para la data de prueba que solo tiene texto en caso.expediente.resultadoFinal
  if (estaCerrado && (!cumplimiento || !nivelRiesgo)) {
    const textoResultado = caso.expediente?.resultadoFinal || '';
    if (textoResultado) {
      const matchPorcentaje = textoResultado.match(/(\d+(?:\.\d+)?)%/);
      if (!cumplimiento && matchPorcentaje) cumplimiento = `${matchPorcentaje[1]}%`;
      if (!cumplimiento) cumplimiento = '0%';
      
      if (!nivelRiesgo) {
        if (textoResultado.toLowerCase().includes('rechaza') || textoResultado.toLowerCase().includes('alto')) nivelRiesgo = 'ALTO';
        else if (textoResultado.toLowerCase().includes('medio')) nivelRiesgo = 'MEDIO';
        else nivelRiesgo = 'BAJO'; // Por defecto si aprueba sin nivel en el texto
      }
    } else {
      // Caso cerrado administrativamente o sin datos generados en el motor
      if (!nivelRiesgo) nivelRiesgo = 'CERRADO (SIN EVALUACIÓN TÉCNICA)';
      if (!cumplimiento) cumplimiento = 'N/A';
    }
  }

  nivelRiesgo = nivelRiesgo || 'PENDIENTE DE EVALUACIÓN';
  cumplimiento = cumplimiento || 'N/A';
    
  const colorRiesgo = nivelRiesgo.includes('ALTO') ? '#dc2626' : (nivelRiesgo.includes('MEDIO') ? '#ea580c' : (nivelRiesgo.includes('BAJO') ? '#16a34a' : '#475569'));

  // Leer el informe real generado por el motor, o usar el dictamen del expediente
  const informe = ultimaEvaluacion?.informe;
  const resumenEjecutivo = informe?.resumenEjecutivo || 'No se ha redactado un resumen ejecutivo para este caso.';
  const hallazgosReal = informe?.hallazgos || informe?.noConformidades || (estaCerrado ? caso.expediente?.resultadoFinal : '');

  // Generamos filas de la tabla de hallazgos
  let filasTabla = '';
  
  if (hallazgosReal) {
    const lineasHallazgos = hallazgosReal.split('\n').filter((l: string) => l.trim().length > 0);
    filasTabla = lineasHallazgos.map((linea: string, i: number) => `
      <tr>
        <td>${ultimaEvaluacion?.fechaProgramada ? new Date(ultimaEvaluacion.fechaProgramada).toLocaleDateString() : new Date().toLocaleDateString()}</td>
        <td>Dictamen / Hallazgo</td>
        <td style="color: #ea580c; font-weight: bold;">${informe?.hallazgos ? 'NC (Detectada)' : 'Observación Oficial'}</td>
        <td>${linea}</td>
      </tr>
    `).join('');
  } else if (tieneEvaluacion && estaCerrado) {
    filasTabla = `<tr><td colspan="4" style="text-align: center; color: #16a34a; font-weight: bold;">Sin hallazgos reportados en la evaluación. Cumplimiento satisfactorio o cierre administrativo.</td></tr>`;
  } else {
    filasTabla = `<tr><td colspan="4" style="text-align: center; font-style: italic; color: #64748b;">Aún no se ha generado el reporte de hallazgos (Evaluación en curso o pendiente).</td></tr>`;
  }

  // 3. Renderizado del HTML con CSS Embebido (Diseño 100% Original)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Acta de Inspección - ${numeroExpediente}</title>
  <style>
    /* Estilos Base y Paginación */
    @page { size: A4 portrait; margin: 1.5cm; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.4;
      background: #ffffff;
      margin: 0; padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* Contenedor Principal */
    .document-wrapper {
      max-width: 100%;
      margin: 0 auto;
    }

    /* Encabezado Principal */
    .header-section {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .header-logo {
      height: 72px;
      width: auto;
      margin-bottom: 10px;
    }
    .header-section h1 {
      font-size: 16px;
      margin: 0;
      font-weight: 800;
      letter-spacing: 1px;
    }
    .header-section h2 {
      font-size: 12px;
      margin: 4px 0 15px 0;
      color: #475569;
      font-weight: 600;
    }
    .title-box {
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 10px;
      border-radius: 4px;
      display: inline-block;
      min-width: 80%;
    }
    .title-box h3 { margin: 0; font-size: 14px; color: #0f172a; }
    .title-box p { margin: 4px 0 0 0; font-size: 11px; font-family: monospace; }

    /* Layout de Columnas para Datos Generales */
    .flex-row {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .info-panel {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    .info-panel-header {
      background-color: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: bold;
      padding: 6px 12px;
      text-transform: uppercase;
    }
    .info-panel-body {
      padding: 12px;
      font-size: 11px;
    }
    .data-row { margin-bottom: 8px; }
    .data-label { font-weight: bold; color: #334155; display: inline-block; width: 130px; }
    .data-value { color: #0f172a; }

    /* Indicadores de Desempeño (KPIs Propios) */
    .kpi-section {
      display: flex;
      gap: 20px;
      margin-bottom: 25px;
    }
    .kpi-card {
      flex: 1;
      text-align: center;
      padding: 15px;
      border-radius: 6px;
      background-color: #f8fafc;
      border-left: 5px solid #0f172a;
      border-right: 1px solid #e2e8f0;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    .kpi-card.risk { border-left-color: ${colorRiesgo}; }
    .kpi-title { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; }
    .kpi-value { font-size: 24px; font-weight: 900; margin-top: 5px; color: #0f172a; }
    .kpi-card.risk .kpi-value { color: ${colorRiesgo}; }

    /* Tablas de Resultados */
    .section-title {
      font-size: 12px;
      font-weight: bold;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 12px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .table-container { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
    .table-container th {
      background-color: #f1f5f9;
      color: #334155;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      font-weight: bold;
    }
    .table-container td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    .table-container tr:nth-child(even) { background-color: #f8fafc; }

    /* Sección de Firmas */
    .signatures-box {
      margin-top: 50px;
      display: flex;
      justify-content: space-around;
      text-align: center;
    }
    .signature-block { width: 40%; }
    .signature-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 8px;
    }
    .signature-name { font-size: 11px; font-weight: bold; color: #0f172a; margin: 0; }
    .signature-role { font-size: 10px; color: #64748b; margin: 2px 0 0 0; }

    /* Pie de página */
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="document-wrapper">
    
    <div class="header-section">
      <img class="header-logo" src="${logo}" alt="SINEC" />
      <h1>MINISTERIO DE SALUD PÚBLICA</h1>
      <h2>DIRECCIÓN GENERAL DE MEDICAMENTOS, ALIMENTOS Y PRODUCTOS SANITARIOS</h2>
      
      <div class="title-box">
        <h3>ACTA OFICIAL DE INSPECCIÓN Y EVALUACIÓN DE RIESGOS</h3>
        <p>EXPEDIENTE NO. ${numeroExpediente}</p>
      </div>
    </div>

    <div class="flex-row">
      <div class="info-panel">
        <div class="info-panel-header">Información del Establecimiento</div>
        <div class="info-panel-body">
          <div class="data-row"><span class="data-label">Razón Social:</span> <span class="data-value">${empresa}</span></div>
          <div class="data-row"><span class="data-label">RNC/Cédula:</span> <span class="data-value">${rnc}</span></div>
          <div class="data-row"><span class="data-label">Nombre Comercial:</span> <span class="data-value">${establecimiento}</span></div>
          <div class="data-row"><span class="data-label">Dirección Física:</span> <span class="data-value">${direccion}</span></div>
        </div>
      </div>
      
      <div class="info-panel">
        <div class="info-panel-header">Detalles de la Inspección</div>
        <div class="info-panel-body">
          <div class="data-row"><span class="data-label">Fecha de Emisión:</span> <span class="data-value">${fechaReporte}</span></div>
          <div class="data-row"><span class="data-label">Motivo de Visita:</span> <span class="data-value">${origen}</span></div>
          <div class="data-row"><span class="data-label">Estado del Caso:</span> <span class="data-value">${caso.estado}</span></div>
          <div class="data-row"><span class="data-label">Técnico Asignado:</span> <span class="data-value">${evaluador}</span></div>
        </div>
      </div>
    </div>

    <div class="kpi-section">
      <div class="kpi-card risk">
        <div class="kpi-title">Nivel de Riesgo Determinado</div>
        <div class="kpi-value">${nivelRiesgo}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Índice de Cumplimiento BPM</div>
        <div class="kpi-value">${cumplimiento}</div>
      </div>
    </div>

    <div class="section-title">Resumen de Evaluaciones y Observaciones Técnicas</div>
    <table class="table-container">
      <thead>
        <tr>
          <th width="15%">Fecha</th>
          <th width="20%">Fase / Estado</th>
          <th width="15%">Calificación</th>
          <th width="50%">Observaciones Relevantes</th>
        </tr>
      </thead>
      <tbody>
        ${filasTabla}
      </tbody>
    </table>

    <div class="signatures-box">
      <div class="signature-block">
        <div class="signature-line"></div>
        <p class="signature-name">${evaluador}</p>
        <p class="signature-role">Inspector(a) Oficial - DIGEMAPS</p>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <p class="signature-name">Representante del Establecimiento</p>
        <p class="signature-role">Firma de conformidad con el acta</p>
      </div>
    </div>

    <div class="footer">
      Documento generado a través de SINEC — Sistema de Evaluación y BPM.<br>
      Cualquier alteración a la información impresa en este certificado invalida su autenticidad legal.
    </div>

  </div>
</body>
</html>`;
}

/**
 * Invoca el motor de impresión nativo del navegador utilizando el diseño HTML generado.
 * Este acercamiento evita librerías de terceros (html2pdf, pdfmake) pesadas
 * y aprovecha la API del sistema operativo.
 */
/**
 * Abre el acta generada en una nueva pestaña a modo de vista previa interactiva.
 * Incluye una barra de herramientas para que el usuario decida en qué momento 
 * desea imprimir o guardar como PDF.
 */
export function generarActaPdf(caso: any) {
  const html = generarHtmlOriginal(caso);
  
  // Agregamos una barra superior flotante para la vista previa (no se mostrará al imprimir)
  const toolbarHtml = `
    <style>
      @media print {
        .preview-toolbar { display: none !important; }
        body { padding-top: 0 !important; }
      }
      .preview-toolbar {
        position: fixed;
        top: 0; left: 0; right: 0;
        background: #1e293b;
        color: white;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 1000;
      }
      .preview-toolbar h2 { margin: 0; font-size: 14px; font-weight: 500; }
      .preview-toolbar button {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      .preview-toolbar button:hover { background: #2563eb; }
      body.preview-mode { padding-top: 60px; background: #94a3b8; }
      .document-wrapper { 
        background: white; 
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); 
        padding: 2cm; 
        max-width: 21cm; /* Ancho A4 */
        margin: 20px auto; 
      }
      @media print {
        .document-wrapper { padding: 0; box-shadow: none; margin: 0; max-width: 100%; }
        body.preview-mode { background: white; }
      }
    </style>
    <div class="preview-toolbar">
      <h2>Vista Previa del Acta (Expediente #${caso.id})</h2>
      <button onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
    </div>
  `;

  // Insertar la barra justo después del <body>
  const finalHtml = html
    .replace('<body>', '<body class="preview-mode">')
    .replace('<div class="document-wrapper">', toolbarHtml + '<div class="document-wrapper">');

  // Abrir nueva pestaña
  const previewWindow = window.open('', '_blank');
  
  if (previewWindow) {
    previewWindow.document.open();
    previewWindow.document.write(finalHtml);
    previewWindow.document.close();
    previewWindow.document.title = `Acta_Inspeccion_SINEC_${caso.id}`;
  } else {
    alert('El navegador bloqueó la apertura de la nueva pestaña. Por favor permite las ventanas emergentes (pop-ups) para ver el acta.');
  }
}
