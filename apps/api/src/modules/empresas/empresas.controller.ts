import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { CrearEmpresaDto, ActualizarEmpresaDto } from './dto/empresa.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'empresas', version: '1' })
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
  crear(@Body() dto: CrearEmpresaDto) {
    return this.empresasService.crear(dto);
  }

  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.empresasService.listar(user);
  }

  @Get(':id')
  obtener(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.empresasService.obtener(id, user);
  }

  @Patch(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COORDINADOR,
    RolUsuario.ADMINISTRADOR_EMPRESA,
  )
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarEmpresaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.empresasService.actualizar(id, dto, user);
  }
}
