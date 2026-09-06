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

    if (!detected || !allowed.includes(detected.mime)) {
      throw new BadRequestException(
        'Tipo de archivo no permitido o el contenido no coincide con su extensión.',
      );
    }

    // Sobrescribe el mimetype declarado por el cliente con el detectado realmente.
    file.mimetype = detected.mime;
    return file;
  }
}
