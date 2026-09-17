import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EstablecimientosService } from './establecimientos.service';
import { CrearEstablecimientoDto, ActualizarEstablecimientoDto } from './dto/establecimiento.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@ApiTags('Establecimientos')
@ApiBearerAuth('access-token')
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
  @ApiOperation({ summary: 'Registrar un nuevo establecimiento sanitario' })
  @ApiResponse({ status: 201, description: 'Establecimiento creado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos del formulario inválidos.' })
  crear(@Body() dto: CrearEstablecimientoDto, @CurrentUser() user: JwtPayload) {
    return this.establecimientosService.crear(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar establecimientos accesibles por el usuario' })
  @ApiResponse({ status: 200, description: 'Lista de establecimientos.' })
  listar(@Query('empresaId') empresaId: string, @CurrentUser() user: JwtPayload) {
    return this.establecimientosService.listar(user, empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un establecimiento por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del establecimiento.' })
  @ApiResponse({ status: 404, description: 'Establecimiento no encontrado.' })
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
  @ApiOperation({ summary: 'Actualizar información de un establecimiento' })
  @ApiResponse({ status: 200, description: 'Establecimiento actualizado exitosamente.' })
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarEstablecimientoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.establecimientosService.actualizar(id, dto, user);
  }
}
