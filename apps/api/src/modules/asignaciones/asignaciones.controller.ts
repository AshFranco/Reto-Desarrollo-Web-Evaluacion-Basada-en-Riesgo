import { Body, Controller, Get, Post } from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service';
import { AsignarEvaluadorDto } from './dto/asignar-evaluador.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'asignaciones', version: '1' })
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  @Post()
  @Roles(RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
  asignar(@Body() dto: AsignarEvaluadorDto, @CurrentUser() user: JwtPayload) {
    return this.asignacionesService.asignar(dto, user.sub);
  }

  @Get('mias')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  misAsignaciones(@CurrentUser() user: JwtPayload) {
    return this.asignacionesService.listarPorEvaluador(user.sub);
  }
}
