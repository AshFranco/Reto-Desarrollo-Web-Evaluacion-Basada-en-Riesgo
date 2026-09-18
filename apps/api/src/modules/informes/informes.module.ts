import { Module } from '@nestjs/common';
import { InformesService } from './informes.service';
import { InformesController } from './informes.controller';
import { PdfService } from '../../common/services/pdf.service';

@Module({
  controllers: [InformesController],
  providers: [InformesService, PdfService],
})
export class InformesModule {}
