import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CasosService } from './casos.service';
import { BuscarCasosHistoricoQuery } from './dto/buscar-casos.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmpresaOwnershipGuard } from '../../common/guards/empresa-ownership.guard';
import { JwtPayload } from '../auth/token.service';

@Controller({ path: 'casos', version: '1' })
export class CasosController {
  constructor(private readonly casosService: CasosService) {}

  @Get()
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
  buscarHistorico(@Query() query: BuscarCasosHistoricoQuery, @CurrentUser() user: JwtPayload) {
    return this.casosService.buscarHistorico(query, user);
  }

  @Get(':id')
  @UseGuards(EmpresaOwnershipGuard('caso'))
  obtener(@Param('id') id: string) {
    return this.casosService.obtener(id);
  }
}
