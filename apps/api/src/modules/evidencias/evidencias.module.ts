import { Module } from '@nestjs/common';
import { EvidenciasService } from './evidencias.service';
import { EvidenciasController } from './evidencias.controller';
import { StorageService } from '../../common/services/storage.service';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';

@Module({
  controllers: [EvidenciasController],
  providers: [EvidenciasService, StorageService, FileValidationPipe],
})
export class EvidenciasModule {}
