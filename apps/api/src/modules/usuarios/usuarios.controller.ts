import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { ResolverRegistroDto } from './dto/resolver-registro.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@ApiTags('Usuarios')
@ApiBearerAuth('access-token')
@Controller({ path: 'usuarios', version: '1' })
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('registros/pendientes')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar usuarios con registro pendiente de validación' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes de registro pendientes.' })
  listarPendientes() {
    return this.usuariosService.listarPendientesValidacion();
  }

  @Patch('registros/:id/resolver')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Aprobar o rechazar solicitud de registro de usuario' })
  @ApiResponse({ status: 200, description: 'Solicitud resuelta exitosamente.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  resolver(@Param('id') id: string, @Body() dto: ResolverRegistroDto) {
    return this.usuariosService.resolverRegistro(id, dto);
  }

  @Get('perfil')
  @ApiOperation({ summary: 'Obtener datos del perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Datos del perfil de usuario.' })
  perfil(@CurrentUser() user: JwtPayload) {
    return this.usuariosService.perfil(user.sub);
  }

  @Get('por-rol/:codigoRol')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Listar usuarios activos que poseen un rol determinado' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios filtrados por rol.' })
  listarPorRol(@Param('codigoRol') codigoRol: string) {
    return this.usuariosService.listarPorRol(codigoRol);
  }

  @Get('todos')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar todos los usuarios del sistema' })
  @ApiResponse({ status: 200, description: 'Lista completa de usuarios con sus roles y estados.' })
  listarTodos() {
    return this.usuariosService.listarTodos();
  }

  @Patch(':id/rol')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar el rol de un usuario del sistema' })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Operación no permitida sobre rol de Administrador.' })
  actualizarRol(@Param('id') id: string, @Body('rolCodigo') rolCodigo: string) {
    return this.usuariosService.actualizarRol(id, rolCodigo);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar el estado de cuenta de un usuario (activo/inactivo)' })
  @ApiResponse({ status: 200, description: 'Estado de usuario actualizado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Operación no permitida sobre Administrador del Sistema.' })
  actualizarEstado(@Param('id') id: string, @Body('estado') estado: string) {
    return this.usuariosService.actualizarEstado(id, estado);
  }
}
