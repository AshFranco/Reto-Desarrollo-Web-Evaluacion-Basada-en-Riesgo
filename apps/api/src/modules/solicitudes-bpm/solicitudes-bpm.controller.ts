import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SolicitudesBpmService } from './solicitudes-bpm.service';
import { CrearSolicitudBpmDto, EnviarSolicitudDto } from './dto/solicitud-bpm.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmpresaOwnershipGuard } from '../../common/guards/empresa-ownership.guard';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'solicitudes-bpm', version: '1' })
export class SolicitudesBpmController {
  constructor(private readonly solicitudesBpmService: SolicitudesBpmService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  crear(@Body() dto: CrearSolicitudBpmDto, @CurrentUser() user: JwtPayload) {
    return this.solicitudesBpmService.crearBorrador(dto, user);
  }

  @Post(':id/enviar')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  @UseGuards(EmpresaOwnershipGuard('solicitudBpm'))
  enviar(
    @Param('id') id: string,
    @Body() dto: EnviarSolicitudDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.solicitudesBpmService.enviar(id, dto, user);
  }

  @Get('mias')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  misSolicitudes(@CurrentUser() user: JwtPayload) {
    return this.solicitudesBpmService.misSolicitudes(user);
  }
}
