import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DenunciasService } from './denuncias.service';
import { CrearDenunciaDto, ResolverDenunciaDto } from './dto/denuncia.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RolUsuario } from '../../common/enums';

@ApiTags('Denuncias')
@ApiBearerAuth('access-token')
@Controller({ path: 'denuncias', version: '1' })
export class DenunciasController {
  constructor(private readonly denunciasService: DenunciasService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Registrar nueva denuncia ciudadana contra un establecimiento' })
  @ApiResponse({ status: 201, description: 'Denuncia registrada exitosamente.' })
  registrar(@Body() dto: CrearDenunciaDto) {
    return this.denunciasService.registrar(dto);
  }

  @Patch(':id/resolver')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Atender o resolver denuncia ciudadana' })
  @ApiResponse({ status: 200, description: 'Denuncia resuelta exitosamente.' })
  resolver(@Param('id') id: string, @Body() dto: ResolverDenunciaDto) {
    return this.denunciasService.resolver(id, dto);
  }

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
  @ApiOperation({ summary: 'Listar denuncias registradas' })
  @ApiResponse({ status: 200, description: 'Lista de denuncias.' })
  listar() {
    return this.denunciasService.listar();
  }
}
