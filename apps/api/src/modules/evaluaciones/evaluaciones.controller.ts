import { Body, Controller, Param, Post } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';
import {
  RegistrarRespuestasDto,
  FinalizarEvaluacionDto,
} from './dto/registrar-respuestas.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'evaluaciones', version: '1' })
export class EvaluacionesController {
  constructor(private readonly evaluacionesService: EvaluacionesService) {}

  @Post(':id/iniciar')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  iniciar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.evaluacionesService.iniciar(id, user.sub);
  }

  @Post(':id/respuestas')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  registrarRespuestas(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegistrarRespuestasDto,
  ) {
    return this.evaluacionesService.registrarRespuestas(id, user.sub, dto);
  }

  @Post(':id/finalizar')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  finalizar(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: FinalizarEvaluacionDto,
  ) {
    return this.evaluacionesService.finalizar(id, user.sub, dto);
  }
}
