import { Controller, Get, Param, Patch } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';

@Controller({ path: 'notificaciones', version: '1' })
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get('mias')
  misNotificaciones(@CurrentUser() user: JwtPayload) {
    return this.notificacionesService.listarMias(user.sub);
  }

  @Patch(':id/leer')
  marcarComoLeida(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.notificacionesService.marcarComoLeida(id, user.sub);
  }
}
