import { Module, forwardRef } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { AuthModule } from '../auth/auth.module';
@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
