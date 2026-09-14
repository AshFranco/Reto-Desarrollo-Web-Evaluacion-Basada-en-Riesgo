import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AlertasLapchService } from './alertas-lapch.service';
import { CrearAlertaLapchDto, ResolverAlertaLapchDto } from './dto/alerta-lapch.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums';

@ApiTags('Alertas LAPCH')
@ApiBearerAuth('access-token')
@Controller({ path: 'alertas-lapch', version: '1' })
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
export class AlertasLapchController {
  constructor(private readonly alertasLapchService: AlertasLapchService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar nueva alerta de laboratorio (LAPCH)' })
  @ApiResponse({ status: 201, description: 'Alerta LAPCH registrada exitosamente.' })
  registrar(@Body() dto: CrearAlertaLapchDto) {
    return this.alertasLapchService.registrar(dto);
  }

  @Patch(':id/resolver')
  @ApiOperation({ summary: 'Resolver o atender alerta LAPCH' })
  @ApiResponse({ status: 200, description: 'Alerta resuelta exitosamente.' })
  resolver(@Param('id') id: string, @Body() dto: ResolverAlertaLapchDto) {
    return this.alertasLapchService.resolver(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar alertas LAPCH registradas' })
  @ApiResponse({ status: 200, description: 'Lista de alertas LAPCH.' })
  listar() {
    return this.alertasLapchService.listar();
  }
}
