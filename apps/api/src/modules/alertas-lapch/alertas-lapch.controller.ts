import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AlertasLapchService } from './alertas-lapch.service';
import { CrearAlertaLapchDto, ResolverAlertaLapchDto } from './dto/alerta-lapch.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'alertas-lapch', version: '1' })
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
export class AlertasLapchController {
  constructor(private readonly alertasLapchService: AlertasLapchService) {}

  @Post()
  registrar(@Body() dto: CrearAlertaLapchDto) {
    return this.alertasLapchService.registrar(dto);
  }

  @Patch(':id/resolver')
  resolver(@Param('id') id: string, @Body() dto: ResolverAlertaLapchDto) {
    return this.alertasLapchService.resolver(id, dto);
  }

  @Get()
  listar() {
    return this.alertasLapchService.listar();
  }
}
