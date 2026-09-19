import { Module } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';

import { PasswordService } from '../auth/password.service';

@Module({
  controllers: [EmpresasController],
  providers: [EmpresasService, PasswordService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
