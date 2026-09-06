import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { InformesService } from './informes.service';
import { GenerarInformeDto, RevisarInformeDto } from './dto/informe.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'informes', version: '1' })
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

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
