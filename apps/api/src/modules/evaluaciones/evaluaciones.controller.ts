import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
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

  @Get('mias')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  misEvaluaciones(@CurrentUser() user: JwtPayload) {
    return this.evaluacionesService.listarMias(user.sub);
  }

  @Get(':id')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  obtener(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.evaluacionesService.obtener(id, user.sub);
  }

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

  @Get(':id/observaciones')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  obtenerObservaciones(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.evaluacionesService.obtenerObservaciones(id, user.sub);
  }

  @Patch(':id/corregir')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  corregir(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegistrarRespuestasDto,
  ) {
    return this.evaluacionesService.corregir(id, user.sub, dto);
  }
}
