import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { extname, join, normalize, resolve } from 'path';
import { AppConfigService } from '../../config/app-config.service';

/**
 * Guarda archivos con una CLAVE OPACA generada por el servidor (UUID),
 * nunca con el nombre original del usuario, evitando:
 *  - Path traversal (../../etc/passwd) vía nombre de archivo.
 *  - Colisiones / sobrescritura intencional de archivos de otros usuarios.
 *  - Ejecución accidental si el nombre original trae una extensión ejecutable
 *    (la extensión persistida se deriva del MIME real, no del nombre dado).
 */
@Injectable()
export class StorageService {
  constructor(private readonly config: AppConfigService) {}

  private extensionParaMime(mime: string): string {
    const mapa: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'video/mp4': '.mp4',
    };
    return mapa[mime] ?? '';
  }

  async guardar(buffer: Buffer, mimeType: string): Promise<{ claveArchivo: string }> {
    const baseDir = resolve(this.config.storageLocalPath);
    await mkdir(baseDir, { recursive: true });

    const claveArchivo = `${randomUUID()}${this.extensionParaMime(mimeType)}`;
    const rutaDestino = normalize(join(baseDir, claveArchivo));

    // Cinturón y tirantes: verifica que la ruta resuelta siga dentro de baseDir.
    if (!rutaDestino.startsWith(baseDir)) {
      throw new Error('Ruta de almacenamiento inválida.');
    }

    await writeFile(rutaDestino, buffer, { mode: 0o640 });
    return { claveArchivo };
  }

  async eliminar(claveArchivo: string): Promise<void> {
    const baseDir = resolve(this.config.storageLocalPath);
    const rutaDestino = normalize(join(baseDir, claveArchivo));

    if (!rutaDestino.startsWith(baseDir)) {
      throw new Error('Ruta de almacenamiento inválida.');
    }

    try {
      await unlink(rutaDestino);
    } catch {
      // Ignorar si el archivo no existe en el sistema de archivos
    }
  }
}
