import { Body, Controller, Post } from '@nestjs/common';
import { MotorRiesgoService } from './motor-riesgo.service';
import { CalcularRiesgoDto } from './dto/calcular-riesgo.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'motor-riesgo', version: '1' })
export class MotorRiesgoController {
  constructor(private readonly motorRiesgoService: MotorRiesgoService) {}

  @Post('calcular')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR, RolUsuario.TECNICO_EVALUADOR)
  async calcular(@Body() dto: CalcularRiesgoDto) {
    return this.motorRiesgoService.calcularRiesgoEstablecimiento(dto);
  }
}
