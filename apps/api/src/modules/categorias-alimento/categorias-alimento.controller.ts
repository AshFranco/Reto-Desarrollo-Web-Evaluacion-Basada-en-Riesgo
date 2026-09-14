import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoriasAlimentoService } from './categorias-alimento.service';
import { AsignarCategoriaDto } from './dto/categoria-alimento.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums';

@ApiTags('Categorías de Alimento')
@ApiBearerAuth('access-token')
@Controller({ path: 'categorias-alimento', version: '1' })
export class CategoriasAlimentoController {
  constructor(private readonly categoriasAlimentoService: CategoriasAlimentoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de categorías y subcategorías de alimento' })
  @ApiResponse({ status: 200, description: 'Catálogo de categorías de alimento con su nivel de riesgo microbiológico.' })
  listarCatalogo() {
    return this.categoriasAlimentoService.listarCatalogo();
  }

  @Post('asignar')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR, RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Asignar subcategoría de alimento a un establecimiento' })
  @ApiResponse({ status: 201, description: 'Subcategoría asignada exitosamente.' })
  asignar(@Body() dto: AsignarCategoriaDto) {
    return this.categoriasAlimentoService.asignarAEstablecimiento(dto);
  }

  @Get('establecimiento/:establecimientoId')
  @ApiOperation({ summary: 'Listar categorías asignadas a un establecimiento específico' })
  @ApiResponse({ status: 200, description: 'Lista de categorías asociadas.' })
  categoriasDeEstablecimiento(@Param('establecimientoId') establecimientoId: string) {
    return this.categoriasAlimentoService.categoriasDeEstablecimiento(establecimientoId);
  }
}
