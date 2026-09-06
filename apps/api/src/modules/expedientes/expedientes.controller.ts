import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { BuscarExpedientesQuery } from './dto/buscar-expedientes.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'expedientes', version: '1' })
export class ExpedientesController {
  constructor(private readonly expedientesService: ExpedientesService) {}

  @Patch(':casoId/cerrar')
  @Roles(RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  cerrar(@Param('casoId') casoId: string) {
    return this.expedientesService.cerrar(casoId);
  }

  @Get()
  buscar(@Query() query: BuscarExpedientesQuery) {
    return this.expedientesService.buscar(query);
  }
}
