import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { IsDateString, IsNumberString, IsOptional } from 'class-validator';
import { CalendarioService } from './calendario.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

class RangoFechasQuery {
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
  // Solo lo usa el Coordinador/Administrador para ver el calendario de un
  // técnico específico (ej. al decidir a quién asignar una evaluación).
  @IsOptional() @IsNumberString() evaluadorId?: string;
}

/**
 * RF-11 (Calendario del Evaluador): el propio técnico ve su calendario sin
 * parámetros extra. RF-10 (Asignación de Evaluador) exige que el
 * Coordinador pueda consultar el calendario de CUALQUIER técnico antes de
 * asignarlo -- para eso usa el parámetro opcional `evaluadorId`.
 */
@Controller({ path: 'calendario', version: '1' })
@Roles(RolUsuario.TECNICO_EVALUADOR, RolUsuario.COORDINADOR, RolUsuario.ADMINISTRADOR)
export class CalendarioController {
  constructor(private readonly calendarioService: CalendarioService) {}

  @Get()
  obtener(@Query() query: RangoFechasQuery, @CurrentUser() user: JwtPayload) {
    const esInterno = user.rol === 'COORDINADOR' || user.rol === 'ADMINISTRADOR';

    if (esInterno && !query.evaluadorId) {
      throw new BadRequestException(
        'Debe indicar el parámetro evaluadorId para consultar el calendario de un técnico.',
      );
    }
    if (!esInterno && query.evaluadorId && query.evaluadorId !== user.sub) {
      throw new BadRequestException('No puede consultar el calendario de otro técnico.');
    }

    const evaluadorId = esInterno ? query.evaluadorId! : user.sub;
    return this.calendarioService.obtenerCalendario(evaluadorId, query.desde, query.hasta);
  }
}
