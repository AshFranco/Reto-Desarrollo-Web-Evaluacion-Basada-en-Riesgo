import { Module } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { ExpedientesController } from './expedientes.controller';
import { PdfService } from '../../common/services/pdf.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
  controllers: [ExpedientesController],
  providers: [ExpedientesService, PdfService],
})
export class ExpedientesModule {}
