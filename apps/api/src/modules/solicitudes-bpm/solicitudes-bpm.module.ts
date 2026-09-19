import { Module } from '@nestjs/common';
import { SolicitudesBpmService } from './solicitudes-bpm.service';
import { SolicitudesBpmController } from './solicitudes-bpm.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { StorageService } from '../../common/services/storage.service';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';

@Module({
  imports: [NotificacionesModule],
  controllers: [SolicitudesBpmController],
  providers: [SolicitudesBpmService, StorageService, FileValidationPipe],
})
export class SolicitudesBpmModule {}
