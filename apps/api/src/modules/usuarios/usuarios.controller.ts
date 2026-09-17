import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { ResolverRegistroDto } from './dto/resolver-registro.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'usuarios', version: '1' })
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('registros/pendientes')
  @Roles(RolUsuario.ADMINISTRADOR)
  listarPendientes() {
    return this.usuariosService.listarPendientesValidacion();
  }

  @Patch('registros/:id/resolver')
  @Roles(RolUsuario.ADMINISTRADOR)
  resolver(@Param('id') id: string, @Body() dto: ResolverRegistroDto) {
    return this.usuariosService.resolverRegistro(id, dto);
  }

  @Get('perfil')
  perfil(@CurrentUser() user: JwtPayload) {
    return this.usuariosService.perfil(user.sub);
  }

  @Get('por-rol/:codigoRol')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
  listarPorRol(@Param('codigoRol') codigoRol: string) {
    return this.usuariosService.listarPorRol(codigoRol);
  }

  @Get('tecnicos')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
  listarTecnicos() {
    return this.usuariosService.listarTecnicosConCarga();
  }
}
