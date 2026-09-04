const MAX_SIDE = 800;
const QUALITY = 0.7;
const QUALITY_SECOND_PASS = 0.5;
const MAX_BLOB_SIZE = 300_000;

function calcularDimensiones(w: number, h: number): { w: number; h: number } {
  const max = Math.max(w, h);
  if (max <= MAX_SIDE) return { w, h };
  const ratio = MAX_SIDE / max;
  return { w: Math.round(w * ratio), h: Math.round(h * ratio) };
}

async function drawAndEncode(img: HTMLImageElement, dims: { w: number; h: number }, quality: number): Promise<Blob> {
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(dims.w, dims.h)
    : Object.assign(document.createElement('canvas'), { width: dims.w, height: dims.h });

  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (!ctx) throw new Error('No se pudo obtener contexto 2D del canvas');
  ctx.drawImage(img as unknown as CanvasImageSource, 0, 0, dims.w, dims.h);

  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality });
  }
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      blob => blob ? resolve(blob) : reject(new Error('toBlob devolvió null')),
      'image/jpeg',
      quality
    );
  });
}

export async function comprimirFoto(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = objectUrl;
  });
  URL.revokeObjectURL(objectUrl);

  const dims = calcularDimensiones(img.width, img.height);
  let blob = await drawAndEncode(img, dims, QUALITY);
  if (blob.size > MAX_BLOB_SIZE) {
    blob = await drawAndEncode(img, dims, QUALITY_SECOND_PASS);
  }
  return blob;
}
