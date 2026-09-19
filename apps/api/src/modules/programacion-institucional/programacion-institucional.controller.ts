import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProgramacionInstitucionalService } from './programacion-institucional.service';
import {
  CrearProgramacionInstitucionalDto,
  ActualizarProgramacionInstitucionalDto,
} from './dto/programacion-institucional.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolUsuario } from '../../common/enums';
import { JwtPayload } from '../auth/token.service';

@ApiTags('Programación Institucional (RF-07)')
@ApiBearerAuth('access-token')
@Controller({ path: 'programacion-institucional', version: '1' })
export class ProgramacionInstitucionalController {
  constructor(private readonly programacionService: ProgramacionInstitucionalService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Registrar nueva programación de evaluación institucional (RF-07)' })
  @ApiResponse({ status: 201, description: 'Programación registrada y caso creado exitosamente.' })
  crear(
    @Body() dto: CrearProgramacionInstitucionalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.programacionService.crear(dto, user.sub);
  }

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR, RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Listar programaciones institucionales' })
  @ApiResponse({ status: 200, description: 'Lista de programaciones institucionales.' })
  listar() {
    return this.programacionService.listar();
  }

  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR, RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Obtener detalle de una programación por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la programación institucional.' })
  obtener(@Param('id') id: string) {
    return this.programacionService.obtener(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Actualizar programación institucional (fecha/prioridad)' })
  @ApiResponse({ status: 200, description: 'Programación actualizada exitosamente.' })
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarProgramacionInstitucionalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.programacionService.actualizar(id, dto, user.sub);
  }
}
