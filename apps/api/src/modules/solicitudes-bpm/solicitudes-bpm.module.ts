import { Module } from '@nestjs/common';
import { SolicitudesBpmService } from './solicitudes-bpm.service';
import { SolicitudesBpmController } from './solicitudes-bpm.controller';

@Module({
  controllers: [SolicitudesBpmController],
  providers: [SolicitudesBpmService],
})
export class SolicitudesBpmModule {}
