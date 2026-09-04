import { Module } from '@nestjs/common';
import { InformesService } from './informes.service';
import { InformesController } from './informes.controller';

@Module({
  controllers: [InformesController],
  providers: [InformesService],
})
export class InformesModule {}
