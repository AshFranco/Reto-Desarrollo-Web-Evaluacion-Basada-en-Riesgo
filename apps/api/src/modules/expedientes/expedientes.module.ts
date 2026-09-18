import { Module } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { ExpedientesController } from './expedientes.controller';
import { PdfService } from '../../common/services/pdf.service';

@Module({
  controllers: [ExpedientesController],
  providers: [ExpedientesService, PdfService],
})
export class ExpedientesModule {}
