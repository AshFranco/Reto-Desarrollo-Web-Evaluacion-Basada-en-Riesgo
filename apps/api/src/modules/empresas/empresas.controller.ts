import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';
import { CrearEmpresaDto, ActualizarEmpresaDto } from './dto/empresa.dto';
import { InvitarDelegadoDto, EstadoDelegadoDto } from './dto/delegados.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@ApiTags('Empresas')
@ApiBearerAuth('access-token')
@Controller({ path: 'empresas', version: '1' })
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Public()
  @Get('publicas')
  listarPublicas() {
    return this.empresasService.listarPublicas();
  }

  // --- Gestión de Delegados ---
  // IMPORTANTE: estas rutas estáticas deben declararse ANTES que @Get(':id') y
  // @Patch(':id') para que Express/NestJS no las capture como parámetro dinámico.

  @Get('delegados')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA)
  @ApiOperation({ summary: 'Listar delegados de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios delegados.' })
  listarDelegados(@CurrentUser() user: JwtPayload) {
    if (!user.empresaId) return [];
    return this.empresasService.listarDelegados(user.empresaId);
  }

  @Post('delegados')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA)
  @ApiOperation({ summary: 'Invitar a un nuevo delegado a la empresa' })
  @ApiResponse({ status: 201, description: 'Delegado creado exitosamente.' })
  invitarDelegado(@Body() dto: InvitarDelegadoDto, @CurrentUser() user: JwtPayload) {
    if (!user.empresaId) return null;
    return this.empresasService.invitarDelegado(user.empresaId, dto);
  }

  @Patch('delegados/:id/estado')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA)
  @ApiOperation({ summary: 'Activar o desactivar a un delegado de la empresa' })
  @ApiResponse({ status: 200, description: 'Estado actualizado.' })
  cambiarEstadoDelegado(
    @Param('id') id: string,
    @Body() dto: EstadoDelegadoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!user.empresaId) return null;
    return this.empresasService.cambiarEstadoDelegado(id, user.empresaId, dto.estado);
  }

  // --- CRUD de Empresa ---

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COORDINADOR,
    RolUsuario.ADMINISTRADOR_EMPRESA,
  )
  @ApiOperation({ summary: 'Registrar nueva empresa titular' })
  @ApiResponse({ status: 201, description: 'Empresa creada exitosamente.' })
  @ApiResponse({ status: 400, description: 'RNC inválido o ya existente.' })
  crear(@Body() dto: CrearEmpresaDto, @CurrentUser() user: JwtPayload) {
    return this.empresasService.crear(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empresas con filtro por rol/titularidad' })
  @ApiResponse({ status: 200, description: 'Lista de empresas.' })
  listar(@CurrentUser() user: JwtPayload) {
    return this.empresasService.listar(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una empresa por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la empresa.' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada.' })
  obtener(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.empresasService.obtener(id, user);
  }

  @Patch(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COORDINADOR,
    RolUsuario.ADMINISTRADOR_EMPRESA,
  )
  @ApiOperation({ summary: 'Actualizar datos de una empresa' })
  @ApiResponse({ status: 200, description: 'Empresa actualizada exitosamente.' })
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarEmpresaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.empresasService.actualizar(id, dto, user);
  }
}
