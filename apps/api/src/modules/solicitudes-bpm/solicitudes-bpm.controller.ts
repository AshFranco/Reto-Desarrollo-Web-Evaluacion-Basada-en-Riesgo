import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SolicitudesBpmService } from './solicitudes-bpm.service';
import { CrearSolicitudBpmDto, EnviarSolicitudDto } from './dto/solicitud-bpm.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmpresaOwnershipGuard } from '../../common/guards/empresa-ownership.guard';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@ApiTags('Solicitudes BPM')
@ApiBearerAuth('access-token')
@Controller({ path: 'solicitudes-bpm', version: '1' })
export class SolicitudesBpmController {
  constructor(private readonly solicitudesBpmService: SolicitudesBpmService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  @ApiOperation({ summary: 'Crear borrador de solicitud de certificación BPM' })
  @ApiResponse({ status: 201, description: 'Borrador de solicitud creado exitosamente.' })
  crear(@Body() dto: CrearSolicitudBpmDto, @CurrentUser() user: JwtPayload) {
    return this.solicitudesBpmService.crearBorrador(dto, user);
  }

  @Post(':id/enviar')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  @UseGuards(EmpresaOwnershipGuard('solicitudBpm'))
  @ApiOperation({ summary: 'Enviar formalmente solicitud de certificación BPM a DIGEMAPS' })
  @ApiResponse({ status: 200, description: 'Solicitud enviada y caso generado.' })
  enviar(
    @Param('id') id: string,
    @Body() dto: EnviarSolicitudDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.solicitudesBpmService.enviar(id, dto, user);
  }

  @Get('mias')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  @ApiOperation({ summary: 'Listar solicitudes BPM de la empresa autenticada' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes de la empresa.' })
  misSolicitudes(@CurrentUser() user: JwtPayload) {
    return this.solicitudesBpmService.misSolicitudes(user);
  }
}
