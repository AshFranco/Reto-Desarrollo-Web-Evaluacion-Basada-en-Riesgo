import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EvaluacionesService } from './evaluaciones.service';
import {
  RegistrarRespuestasDto,
  FinalizarEvaluacionDto,
} from './dto/registrar-respuestas.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@ApiTags('Evaluaciones')
@ApiBearerAuth('access-token')
@Controller({ path: 'evaluaciones', version: '1' })
export class EvaluacionesController {
  constructor(private readonly evaluacionesService: EvaluacionesService) {}

  @Get('mias')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Listar evaluaciones asignadas al técnico autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de evaluaciones asignadas.' })
  misEvaluaciones(@CurrentUser() user: JwtPayload) {
    return this.evaluacionesService.listarMias(user.sub);
  }

  @Get(':id')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Obtener detalle de una evaluación por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la evaluación y su ficha.' })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada.' })
  obtener(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.evaluacionesService.obtener(id, user.sub);
  }

  @Post(':id/iniciar')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Marcar inicio formal de la evaluación in-situ' })
  @ApiResponse({ status: 200, description: 'Evaluación iniciada exitosamente.' })
  iniciar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.evaluacionesService.iniciar(id, user.sub);
  }

  @Post(':id/respuestas')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Guardar respuestas de criterios de la ficha BPM' })
  @ApiResponse({ status: 200, description: 'Respuestas guardadas/actualizadas exitosamente.' })
  registrarRespuestas(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegistrarRespuestasDto,
  ) {
    return this.evaluacionesService.registrarRespuestas(id, user.sub, dto);
  }

  @Post(':id/finalizar')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Finalizar evaluación, calcular matriz de riesgo y generar informe técnico' })
  @ApiResponse({ status: 200, description: 'Evaluación finalizada con informe generado.' })
  @ApiResponse({ status: 400, description: 'Criterios incompletos o sin firmas.' })
  finalizar(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: FinalizarEvaluacionDto,
  ) {
    return this.evaluacionesService.finalizar(id, user.sub, dto);
  }

  @Post(':id/reabrir')
  @Roles(RolUsuario.TECNICO_EVALUADOR, RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Reabrir evaluación devuelta para subsanar observaciones' })
  @ApiResponse({ status: 200, description: 'Evaluación reabierta exitosamente.' })
  reabrir(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.evaluacionesService.reabrir(id, user.sub, user.rol);
  }
}

