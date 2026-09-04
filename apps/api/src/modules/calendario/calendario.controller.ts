import { Controller, Get, Query } from '@nestjs/common';
import { IsDateString, IsOptional } from 'class-validator';
import { CalendarioService } from './calendario.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

class RangoFechasQuery {
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
}

@Controller({ path: 'calendario', version: '1' })
@Roles(RolUsuario.TECNICO_EVALUADOR)
export class CalendarioController {
  constructor(private readonly calendarioService: CalendarioService) {}

  @Get()
  obtener(@Query() query: RangoFechasQuery, @CurrentUser() user: JwtPayload) {
    return this.calendarioService.obtenerCalendario(user.sub, query.desde, query.hasta);
  }
}
