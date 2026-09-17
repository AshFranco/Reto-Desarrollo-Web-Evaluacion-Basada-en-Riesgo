import { Controller, Get, Param, Patch, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExpedientesService } from './expedientes.service';
import { BuscarExpedientesQuery } from './dto/buscar-expedientes.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

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
  async descargarPdf(@Param('casoId') casoId: string, @Res() res: Response) {
    const pdfBuffer = await this.expedientesService.generarPdf(casoId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=expediente_caso_${casoId}.pdf`);
    res.send(pdfBuffer);
  }

  @Patch(':casoId/cerrar')
  @Roles(RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  cerrar(@Param('casoId') casoId: string) {
    return this.expedientesService.cerrar(casoId);
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
  buscar(@Query() query: BuscarExpedientesQuery, @CurrentUser() user: JwtPayload) {
    return this.expedientesService.buscar(query, user);
  }
}
