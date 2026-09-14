import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EvidenciasService } from './evidencias.service';
import { SubirEvidenciaDto } from './dto/subir-evidencia.dto';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@ApiTags('Evidencias')
@ApiBearerAuth('access-token')
@Controller({ path: 'evidencias', version: '1' })
export class EvidenciasController {
  constructor(private readonly evidenciasService: EvidenciasService) {}

  @Post()
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Subir archivo o fotografía de evidencia asociada a un criterio' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Evidencia subida y asociada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o tamaño excedido.' })
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

  @Delete(':id')
  @Roles(RolUsuario.TECNICO_EVALUADOR)
  @ApiOperation({ summary: 'Eliminar archivo de evidencia por ID' })
  @ApiResponse({ status: 200, description: 'Evidencia eliminada exitosamente.' })
  @ApiResponse({ status: 404, description: 'Evidencia no encontrada.' })
  async eliminar(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.evidenciasService.eliminar(id, user.sub);
  }
}
