import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import * as FileType from 'file-type';
import { AppConfigService } from '../../config/app-config.service';

/**
 * Restringe archivos subidos (evidencias, adjuntos) por:
 *  - Tamaño máximo (configurable, MAX_FILE_SIZE_MB).
 *  - Tipo MIME REAL detectado por "magic bytes" (no el `Content-Type`
 *    declarado por el cliente, que es trivialmente falsificable), contra
 *    una lista blanca.
 *  - Nombre de archivo saneado (se descarta el nombre original para
 *    almacenamiento; se usa solo para mostrarlo, nunca como ruta física).
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly config: AppConfigService) {}

  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    if (file.size > this.config.maxFileSizeBytes) {
      throw new BadRequestException(
        `El archivo excede el tamaño máximo permitido (${this.config.maxFileSizeBytes / 1024 / 1024} MB).`,
      );
    }

    const detected = await FileType.fromBuffer(file.buffer);
    const allowed = this.config.allowedFileMimeTypes;

    let mimeEfectivo = detected?.mime;

    // Para archivos de texto estructurado de geolocalización (geojson, json, kml, gpx),
    // file-type no tiene magic bytes fijos. Validamos su estructura y asignamos su MIME.
    if (!mimeEfectivo && file.originalname) {
      const ext = file.originalname.toLowerCase().split('.').pop() ?? '';
      if (ext === 'geojson' || ext === 'json') {
        try {
          JSON.parse(file.buffer.toString('utf8'));
          mimeEfectivo = ext === 'geojson' ? 'application/geo+json' : 'application/json';
        } catch {
          // No es JSON válido
        }
      } else if (ext === 'kml') {
        const contenido = file.buffer.toString('utf8', 0, Math.min(file.buffer.length, 1024));
        if (contenido.includes('<kml') || contenido.includes('xmlns')) {
          mimeEfectivo = 'application/vnd.google-earth.kml+xml';
        }
      } else if (ext === 'gpx') {
        const contenido = file.buffer.toString('utf8', 0, Math.min(file.buffer.length, 1024));
        if (contenido.includes('<gpx') || contenido.includes('xmlns')) {
          mimeEfectivo = 'application/gpx+xml';
        }
      }
    }

    if (!mimeEfectivo || !allowed.includes(mimeEfectivo)) {
      throw new BadRequestException(
        'Tipo de archivo no permitido o el contenido no coincide con su extensión.',
      );
    }

    // Sobrescribe el mimetype declarado por el cliente con el verificado realmente.
    file.mimetype = mimeEfectivo;
    return file;
  }
}
