import { Module, forwardRef } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { PasswordService } from '../auth/password.service';
import { AuthModule } from '../auth/auth.module';
@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [EmpresasController],
  providers: [EmpresasService, PasswordService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
