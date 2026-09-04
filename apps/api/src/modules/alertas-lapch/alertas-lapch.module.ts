import { Module } from '@nestjs/common';
import { AlertasLapchService } from './alertas-lapch.service';
import { AlertasLapchController } from './alertas-lapch.controller';

@Module({
  controllers: [AlertasLapchController],
  providers: [AlertasLapchService],
})
export class AlertasLapchModule {}
