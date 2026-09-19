import { httpClient } from '@/lib/http/client';

export async function descargarActaPdf(evaluacionId: string | number): Promise<void> {
  const response = await httpClient.get(`/informes/${evaluacionId}/pdf`, {
    responseType: 'blob', // Importante para recibir el archivo binario
  });

  // Crear una URL temporal para el blob
  const fileURL = window.URL.createObjectURL(new Blob([response.data as any], { type: 'application/pdf' }));
  
  // Abrir en nueva pestaña
  const previewWindow = window.open(fileURL, '_blank');
  
  if (!previewWindow) {
    // Si el navegador bloqueó el popup, usamos fallback a descarga directa
    const link = document.createElement('a');
    link.href = fileURL;
    link.setAttribute('download', `Acta_Inspeccion_SINEC_${evaluacionId}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
