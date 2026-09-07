import { Body, Controller, Get, Post } from '@nestjs/common';
import { MotorRiesgoService } from './motor-riesgo.service';
import { CalcularRiesgoDto } from './dto/calcular-riesgo.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'motor-riesgo', version: '1' })
export class MotorRiesgoController {
  constructor(private readonly motorRiesgoService: MotorRiesgoService) {}

  /**
   * Catálogo estático (factores + rangos) para que el técnico pueda
   * calcular el riesgo OFFLINE con @ebr/risk-engine en el dispositivo,
   * sin depender de este endpoint mientras esté sin conexión. La PWA
   * descarga esto una vez (con señal) y lo guarda en IndexedDB.
   */
  @Get('catalogo')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR, RolUsuario.TECNICO_EVALUADOR)
  async obtenerCatalogo() {
    return this.motorRiesgoService.obtenerCatalogoOffline();
  }

  @Post('calcular')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR, RolUsuario.TECNICO_EVALUADOR)
  async calcular(@Body() dto: CalcularRiesgoDto) {
    return this.motorRiesgoService.calcularRiesgoEstablecimiento(dto);
  }
}
