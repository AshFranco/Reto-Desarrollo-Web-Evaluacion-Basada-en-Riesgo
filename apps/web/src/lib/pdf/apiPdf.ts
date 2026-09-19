import { apiFetch } from '@/lib/http/client';

export async function descargarActaPdf(evaluacionId: string | number): Promise<void> {
  const respuesta = await apiFetch(`/api/v1/informes/${evaluacionId}/pdf`, {
    method: 'GET',
  });

  if (!respuesta.ok) {
    throw new Error(`No se pudo generar el acta PDF (${respuesta.status})`);
  }

  const blob = await respuesta.blob();
  const fileURL = window.URL.createObjectURL(blob);
  
  const previewWindow = window.open(fileURL, '_blank');
  
  if (!previewWindow) {
    const link = document.createElement('a');
    link.href = fileURL;
    link.setAttribute('download', `Acta_Inspeccion_SINEC_${evaluacionId}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
