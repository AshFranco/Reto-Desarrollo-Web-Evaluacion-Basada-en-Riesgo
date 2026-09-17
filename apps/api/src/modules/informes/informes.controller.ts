import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { InformesService } from './informes.service';
import { GenerarInformeDto, RevisarInformeDto } from './dto/informe.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'informes', version: '1' })
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Get(':evaluacionId/pdf')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COORDINADOR,
    RolUsuario.TECNICO_EVALUADOR,
    RolUsuario.ADMINISTRADOR_EMPRESA,
    RolUsuario.USUARIO_DELEGADO,
  )
  async descargarPdf(@Param('evaluacionId') evaluacionId: string, @Res() res: Response) {
    const pdfBuffer = await this.informesService.generarPdf(evaluacionId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=informe_${evaluacionId}.pdf`);
    res.send(pdfBuffer);
  }

  @Post()
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  generar(@Body() dto: GenerarInformeDto, @CurrentUser() user: JwtPayload) {
    return this.informesService.generar(dto, user.sub);
  }

  @Patch(':evaluacionId/revisar')
  @Roles(RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  revisar(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: RevisarInformeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.informesService.revisar(evaluacionId, dto, user.sub);
  }
}
