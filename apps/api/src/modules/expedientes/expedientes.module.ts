import { Module } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { ExpedientesController } from './expedientes.controller';
import { PdfService } from '../../common/services/pdf.service';
import { EmailService } from '../../common/services/email.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { InformesModule } from '../informes/informes.module';

@Module({
  imports: [NotificacionesModule, InformesModule],
  controllers: [ExpedientesController],
  providers: [ExpedientesService, PdfService, EmailService],
})
export class ExpedientesModule {}
