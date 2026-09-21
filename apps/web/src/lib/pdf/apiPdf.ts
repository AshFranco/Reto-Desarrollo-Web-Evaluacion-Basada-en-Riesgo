import { apiFetch } from '@/lib/http/client';

export async function descargarActaPdf(
  evaluacionId: string | number,
  nombreEstablecimiento?: string,
): Promise<void> {
  const respuesta = await apiFetch(`/api/v1/informes/${evaluacionId}/pdf`, {
    method: 'GET',
  });

  if (!respuesta.ok) {
    throw new Error(`No se pudo generar el acta PDF (${respuesta.status})`);
  }

  // Nombre de archivo sugerido por defecto en caso de no poder leer cabeceras
  const slug = (nombreEstablecimiento || 'Establecimiento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 35);
  const fechaHoy = new Date().toISOString().split('T')[0];
  let nombreArchivo = `Ficha_BPM_${slug}_Eval_${evaluacionId}_${fechaHoy}.pdf`;

  // Extraer el nombre oficial provisto por el servidor en la cabecera Content-Disposition
  const disposition = respuesta.headers.get('content-disposition');
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const standardMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
    if (utf8Match && utf8Match[1]) {
      nombreArchivo = decodeURIComponent(utf8Match[1].trim());
    } else if (standardMatch && standardMatch[1]) {
      nombreArchivo = standardMatch[1].replace(/['"]/g, '').trim();
    }
  }

  const blob = await respuesta.blob();
  const fileURL = window.URL.createObjectURL(blob);

  // Descarga directa con el nombre limpio para evitar UUIDs o códigos temporales de ventana
  const link = document.createElement('a');
  link.href = fileURL;
  link.setAttribute('download', nombreArchivo);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => window.URL.revokeObjectURL(fileURL), 2000);
}
