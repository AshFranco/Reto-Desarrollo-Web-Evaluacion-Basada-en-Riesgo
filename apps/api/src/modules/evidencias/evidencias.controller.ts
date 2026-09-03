import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EvidenciasService } from './evidencias.service';
import { SubirEvidenciaDto } from './dto/subir-evidencia.dto';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@Controller({ path: 'evidencias', version: '1' })
export class EvidenciasController {
  constructor(private readonly evidenciasService: EvidenciasService) {}

  @Post()
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(), // se valida en memoria antes de persistir a disco
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  async subir(
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Body() dto: SubirEvidenciaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.evidenciasService.subir(file, dto, user.sub);
  }
}
