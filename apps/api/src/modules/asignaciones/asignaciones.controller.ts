import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AsignacionesService } from './asignaciones.service';
import { AsignarEvaluadorDto } from './dto/asignar-evaluador.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@ApiTags('Asignaciones')
@ApiBearerAuth('access-token')
@Controller({ path: 'asignaciones', version: '1' })
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  @Post()
  @Roles(RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Asignar o reasignar técnico evaluador a un caso' })
  @ApiResponse({ status: 201, description: 'Asignación creada o actualizada exitosamente.' })
  @ApiResponse({ status: 404, description: 'Caso o evaluador no encontrado.' })
  asignar(@Body() dto: AsignarEvaluadorDto, @CurrentUser() user: JwtPayload) {
    return this.asignacionesService.asignar(dto, user.sub);
  }

  @Delete(':casoId')
  @Roles(RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desvincular técnico evaluador de un caso' })
  @ApiResponse({ status: 200, description: 'Técnico desvinculado del caso.' })
  @ApiResponse({ status: 404, description: 'Caso o asignación no encontrada.' })
  desasignar(@Param('casoId') casoId: string) {
    return this.asignacionesService.desasignar(casoId);
  }

  @Get('mias')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Listar casos asignados al evaluador autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de casos asignados.' })
  misAsignaciones(@CurrentUser() user: JwtPayload) {
    return this.asignacionesService.listarPorEvaluador(user.sub);
  }
}

