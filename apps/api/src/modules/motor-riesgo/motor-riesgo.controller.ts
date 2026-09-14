import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MotorRiesgoService } from './motor-riesgo.service';
import { CalcularRiesgoDto } from './dto/calcular-riesgo.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums';

@ApiTags('Motor de Riesgo')
@ApiBearerAuth('access-token')
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
  @ApiOperation({ summary: 'Obtener catálogo de parámetros y rangos para cálculo offline' })
  @ApiResponse({ status: 200, description: 'Catálogo de factores y matrices para la PWA.' })
  async obtenerCatalogo() {
    return this.motorRiesgoService.obtenerCatalogoOffline();
  }

  @Post('calcular')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR, RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Calcular matriz de riesgo sanitaria (RE, RP, RT, frecuencia)' })
  @ApiResponse({ status: 200, description: 'Resultado completo del cálculo de riesgo.' })
  @ApiResponse({ status: 400, description: 'Parámetros de cálculo o factores incompletos.' })
  async calcular(@Body() dto: CalcularRiesgoDto) {
    return this.motorRiesgoService.calcularRiesgoEstablecimiento(dto);
  }
}
