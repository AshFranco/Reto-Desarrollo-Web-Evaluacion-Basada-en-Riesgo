import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InformesService } from './informes.service';
import { GenerarInformeDto, RevisarInformeDto } from './dto/informe.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@ApiTags('Informes')
@ApiBearerAuth('access-token')
@Controller({ path: 'informes', version: '1' })
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Post()
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Generar informe técnico de evaluación BPM' })
  @ApiResponse({ status: 201, description: 'Informe técnico generado exitosamente.' })
  generar(@Body() dto: GenerarInformeDto, @CurrentUser() user: JwtPayload) {
    return this.informesService.generar(dto, user.sub);
  }

  @Patch(':evaluacionId/revisar')
  @Roles(RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Revisar informe técnico (aprobar o devolver para corrección)' })
  @ApiResponse({ status: 200, description: 'Informe revisado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Estado de evaluación inválido para revisión.' })
  revisar(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: RevisarInformeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.informesService.revisar(evaluacionId, dto, user.sub);
  }

  @Patch(':evaluacionId/revertir-revision')
  @Roles(RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Revertir estado de revisión de un informe devuelto por error' })
  @ApiResponse({ status: 200, description: 'Revisión revertida exitosamente.' })
  revertirRevision(
    @Param('evaluacionId') evaluacionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.informesService.revertirRevision(evaluacionId, user.sub);
  }
}
