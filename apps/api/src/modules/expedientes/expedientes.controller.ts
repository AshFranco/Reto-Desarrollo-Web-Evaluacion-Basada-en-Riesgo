import { Controller, Get, Param, Patch, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExpedientesService } from './expedientes.service';
import { BuscarExpedientesQuery } from './dto/buscar-expedientes.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@ApiTags('Expedientes')
@ApiBearerAuth('access-token')
@Controller({ path: 'expedientes', version: '1' })
export class ExpedientesController {
  constructor(private readonly expedientesService: ExpedientesService) {}

  @Get(':casoId/pdf')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COORDINADOR,
    RolUsuario.TECNICO_EVALUADOR,
    RolUsuario.ADMINISTRADOR_EMPRESA,
    RolUsuario.USUARIO_DELEGADO,
  )
  @ApiOperation({ summary: 'Descargar el PDF consolidado del expediente del caso' })
  @ApiResponse({ status: 200, description: 'Archivo PDF del expediente.' })
  async descargarPdf(@Param('casoId') casoId: string, @Res() res: Response) {
    const pdfBuffer = await this.expedientesService.generarPdf(casoId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=expediente_caso_${casoId}.pdf`);
    res.send(pdfBuffer);
  }

  @Patch(':casoId/cerrar')
  @Roles(RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Cerrar formalmente el expediente de un caso' })
  @ApiResponse({ status: 200, description: 'Expediente cerrado exitosamente.' })
  @ApiResponse({ status: 400, description: 'El caso no cuenta con informe aprobado para cierre.' })
  cerrar(@Param('casoId') casoId: string) {
    return this.expedientesService.cerrar(casoId);
  }

  @Patch(':casoId/reabrir')
  @Roles(RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Reabrir formalmente un expediente cerrado' })
  @ApiResponse({ status: 200, description: 'Expediente reabierto exitosamente.' })
  @ApiResponse({ status: 400, description: 'El expediente no se encuentra cerrado.' })
  reabrir(@Param('casoId') casoId: string) {
    return this.expedientesService.reabrir(casoId);
  }

  /**
   * Hueco de seguridad reportado y corregido: antes no tenia @Roles ni
   * scoping forzado por empresa -- un usuario de Empresa o un Tecnico
   * podian ver expedientes de CUALQUIER empresa, no solo la suya, porque
   * el filtro empresaId era opcional (lo decidia el cliente, no el server).
   */
  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COORDINADOR,
    RolUsuario.TECNICO_EVALUADOR,
    RolUsuario.ADMINISTRADOR_EMPRESA,
    RolUsuario.USUARIO_DELEGADO,
  )
  @ApiOperation({ summary: 'Consultar expedientes cerrados con scoping por empresa' })
  @ApiResponse({ status: 200, description: 'Lista de expedientes cerrados.' })
  buscar(@Query() query: BuscarExpedientesQuery, @CurrentUser() user: JwtPayload) {
    return this.expedientesService.buscar(query, user);
  }
}
