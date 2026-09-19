import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { BuscarAuditoriaQuery } from './dto/registrar-auditoria.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../../common/enums';

@ApiTags('Auditoría')
@ApiBearerAuth('access-token')
@Controller({ path: 'auditoria', version: '1' })
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar bitácora de eventos de auditoría' })
  @ApiResponse({ status: 200, description: 'Lista de registros de auditoría.' })
  listar(@Query() query: BuscarAuditoriaQuery) {
    return this.auditoriaService.listar(query);
  }
}
