import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CasosService } from './casos.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmpresaOwnershipGuard } from '../../common/guards/empresa-ownership.guard';
import { JwtPayload } from '../auth/token.service';

@Controller({ path: 'casos', version: '1' })
export class CasosController {
  constructor(private readonly casosService: CasosService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.casosService.listar(user);
  }

  @Get(':id')
  @UseGuards(EmpresaOwnershipGuard('caso'))
  obtener(@Param('id') id: string) {
    return this.casosService.obtener(id);
  }
}
