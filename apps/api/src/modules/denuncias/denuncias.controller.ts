import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DenunciasService } from './denuncias.service';
import { CrearDenunciaDto, ResolverDenunciaDto } from './dto/denuncia.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'denuncias', version: '1' })
export class DenunciasController {
  constructor(private readonly denunciasService: DenunciasService) {}

  @Public()
  @Post()
  registrar(@Body() dto: CrearDenunciaDto) {
    return this.denunciasService.registrar(dto);
  }

  @Patch(':id/resolver')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
  resolver(@Param('id') id: string, @Body() dto: ResolverDenunciaDto) {
    return this.denunciasService.resolver(id, dto);
  }

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COORDINADOR)
  listar() {
    return this.denunciasService.listar();
  }
}
