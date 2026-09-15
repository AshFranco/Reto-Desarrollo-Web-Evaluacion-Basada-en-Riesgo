import { Body, Controller, Get, Param, Patch, Post, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { ResolverRegistroDto } from './dto/resolver-registro.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { Activar2FaDto } from './dto/activar-2fa.dto';
import { Desactivar2FaDto } from './dto/desactivar-2fa.dto';
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

  @Patch('perfil')
  @ApiOperation({ summary: 'Actualizar datos del perfil (teléfono, nombre, 2FA)' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente.' })
  actualizarPerfil(@CurrentUser() user: JwtPayload, @Body() dto: ActualizarPerfilDto) {
    return this.usuariosService.actualizarPerfil(user.sub, dto);
  }

  @Post('perfil/2fa/generar')
  @ApiOperation({ summary: 'Generar clave y código QR para vincular Google Authenticator (TOTP)' })
  @ApiResponse({ status: 200, description: 'Secreto Base32 y código QR generado.' })
  generar2Fa(@CurrentUser() user: JwtPayload) {
    return this.usuariosService.generar2Fa(user.sub);
  }

  @Post('perfil/2fa/activar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar verificación en dos pasos validando el primer código de 6 dígitos' })
  @ApiResponse({ status: 200, description: '2FA activado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Código TOTP incorrecto o expirado.' })
  activar2Fa(@CurrentUser() user: JwtPayload, @Body() dto: Activar2FaDto) {
    return this.usuariosService.activar2Fa(user.sub, dto);
  }

  @Post('perfil/2fa/desactivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar verificación en dos pasos confirmando con contraseña' })
  @ApiResponse({ status: 200, description: '2FA desactivado exitosamente.' })
  @ApiResponse({ status: 401, description: 'Contraseña actual incorrecta.' })
  desactivar2Fa(@CurrentUser() user: JwtPayload, @Body() dto: Desactivar2FaDto) {
    return this.usuariosService.desactivar2Fa(user.sub, dto);
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

  @Patch('perfil/contrasena')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar la contraseña del usuario autenticado (autoservicio)' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada y sesión revocada en otros dispositivos.' })
  @ApiResponse({ status: 400, description: 'La nueva contraseña es igual a la actual o datos inválidos.' })
  @ApiResponse({ status: 401, description: 'La contraseña actual no es correcta.' })
  cambiarContrasena(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CambiarContrasenaDto,
  ) {
    return this.usuariosService.cambiarContrasena(user.sub, dto);
  }
}
