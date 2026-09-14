import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CasosService } from './casos.service';
import { BuscarCasosHistoricoQuery } from './dto/buscar-casos.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmpresaOwnershipGuard } from '../../common/guards/empresa-ownership.guard';
import { JwtPayload } from '../auth/token.service';

@ApiTags('Casos')
@ApiBearerAuth('access-token')
@Controller({ path: 'casos', version: '1' })
export class CasosController {
  constructor(private readonly casosService: CasosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar casos correspondientes al usuario o rol' })
  @ApiResponse({ status: 200, description: 'Lista de casos.' })
  listar(@CurrentUser() user: JwtPayload) {
    return this.casosService.listar(user);
  }

  /**
   * RF de consulta histórica (Fase 7): busca sobre TODO el historial de
   * casos, no solo los cerrados -- con filtros por empresa, solicitud,
   * evaluación y rango de fecha de creación. Complementa a
   * GET /expedientes, que solo cubre casos ya cerrados.
   */
  @Get('historico')
  @ApiOperation({ summary: 'Consulta histórica de casos con filtros avanzados' })
  @ApiResponse({ status: 200, description: 'Lista de casos históricos filtrados.' })
  buscarHistorico(@Query() query: BuscarCasosHistoricoQuery, @CurrentUser() user: JwtPayload) {
    return this.casosService.buscarHistorico(query, user);
  }

  @Get(':id')
  @UseGuards(EmpresaOwnershipGuard('caso'))
  @ApiOperation({ summary: 'Obtener detalle de un caso por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del caso.' })
  @ApiResponse({ status: 404, description: 'Caso no encontrado.' })
  obtener(@Param('id') id: string) {
    return this.casosService.obtener(id);
  }
}
