import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import { CrearTipoEstablecimientoDto, ActualizarTipoEstablecimientoDto } from './dto/tipo-establecimiento.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums';

@ApiTags('Catálogos')
@ApiBearerAuth('access-token')
@Controller({ path: 'catalogos', version: '1' })
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('tipos-establecimiento')
  @ApiOperation({ summary: 'Listar tipos de establecimiento sanitario' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de establecimiento.' })
  listarTipos(@Query('todos') todos?: string) {
    const soloActivos = todos !== 'true';
    return this.catalogosService.listarTipos(soloActivos);
  }

  @Post('tipos-establecimiento')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear nuevo tipo de establecimiento en el catálogo' })
  @ApiResponse({ status: 201, description: 'Tipo de establecimiento creado exitosamente.' })
  crearTipo(@Body() dto: CrearTipoEstablecimientoDto) {
    return this.catalogosService.crearTipo(dto);
  }

  @Patch('tipos-establecimiento/:id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar tipo de establecimiento' })
  @ApiResponse({ status: 200, description: 'Tipo de establecimiento actualizado exitosamente.' })
  actualizarTipo(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarTipoEstablecimientoDto) {
    return this.catalogosService.actualizarTipo(id, dto);
  }

  @Delete('tipos-establecimiento/:id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar o eliminar tipo de establecimiento' })
  @ApiResponse({ status: 200, description: 'Tipo de establecimiento desactivado/eliminado.' })
  eliminarTipo(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.eliminarTipo(id);
  }
}
