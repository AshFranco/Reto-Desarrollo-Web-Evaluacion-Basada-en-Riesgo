import { Module } from '@nestjs/common';
import { MotorRiesgoService } from './motor-riesgo.service';
import { MotorRiesgoController } from './motor-riesgo.controller';

@Module({
  controllers: [MotorRiesgoController],
  providers: [MotorRiesgoService],
  exports: [MotorRiesgoService],
})
export class MotorRiesgoModule {}
