import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { EstablecimientosService } from './establecimientos.service';
import { CrearEstablecimientoDto, ActualizarEstablecimientoDto } from './dto/establecimiento.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'establecimientos', version: '1' })
export class EstablecimientosController {
  constructor(private readonly establecimientosService: EstablecimientosService) {}

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COORDINADOR,
    RolUsuario.ADMINISTRADOR_EMPRESA,
    RolUsuario.USUARIO_DELEGADO,
  )
  crear(@Body() dto: CrearEstablecimientoDto, @CurrentUser() user: JwtPayload) {
    return this.establecimientosService.crear(dto, user);
  }

  @Get()
  listar(@Query('empresaId') empresaId: string, @CurrentUser() user: JwtPayload) {
    return this.establecimientosService.listar(user, empresaId);
  }

  @Get(':id')
  obtener(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.establecimientosService.obtener(id, user);
  }

  @Patch(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COORDINADOR,
    RolUsuario.ADMINISTRADOR_EMPRESA,
    RolUsuario.USUARIO_DELEGADO,
  )
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarEstablecimientoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.establecimientosService.actualizar(id, dto, user);
  }
}
