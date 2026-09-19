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
