import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
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
import { SolicitudesBpmService } from './solicitudes-bpm.service';
import { CrearSolicitudBpmDto, EnviarSolicitudDto, SubirAdjuntoSolicitudDto } from './dto/solicitud-bpm.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmpresaOwnershipGuard } from '../../common/guards/empresa-ownership.guard';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { JwtPayload } from '../auth/token.service';
import { RolUsuario } from '../../common/enums';

@ApiTags('Solicitudes BPM')
@ApiBearerAuth('access-token')
@Controller({ path: 'solicitudes-bpm', version: '1' })
export class SolicitudesBpmController {
  constructor(private readonly solicitudesBpmService: SolicitudesBpmService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  @ApiOperation({ summary: 'Crear borrador de solicitud de certificación BPM' })
  @ApiResponse({ status: 201, description: 'Borrador de solicitud creado exitosamente.' })
  crear(@Body() dto: CrearSolicitudBpmDto, @CurrentUser() user: JwtPayload) {
    return this.solicitudesBpmService.crearBorrador(dto, user);
  }

  @Post(':id/enviar')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  @UseGuards(EmpresaOwnershipGuard('solicitudBpm'))
  @ApiOperation({ summary: 'Enviar formalmente solicitud de certificación BPM a DIGEMAPS' })
  @ApiResponse({ status: 200, description: 'Solicitud enviada y caso generado.' })
  enviar(
    @Param('id') id: string,
    @Body() dto: EnviarSolicitudDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.solicitudesBpmService.enviar(id, dto, user);
  }

  @Get('mias')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  @ApiOperation({ summary: 'Listar solicitudes BPM de la empresa autenticada' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes de la empresa.' })
  misSolicitudes(@CurrentUser() user: JwtPayload) {
    return this.solicitudesBpmService.misSolicitudes(user);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  @ApiOperation({ summary: 'Descartar un borrador de solicitud BPM (no enviada)' })
  @ApiResponse({ status: 200, description: 'Borrador descartado.' })
  @ApiResponse({ status: 400, description: 'La solicitud ya fue enviada.' })
  descartar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.solicitudesBpmService.descartar(id, user);
  }

  @Post(':id/adjuntos')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  @ApiOperation({ summary: 'Adjuntar documentación (croquis, memoria descriptiva) a una solicitud BPM en borrador' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Adjunto subido exitosamente.' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o la solicitud ya fue enviada.' })
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  subirAdjunto(
    @Param('id') id: string,
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Body() dto: SubirAdjuntoSolicitudDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.solicitudesBpmService.subirAdjunto(id, file, dto.tipo, user);
  }

  @Get(':id/adjuntos')
  @Roles(
    RolUsuario.ADMINISTRADOR_EMPRESA,
    RolUsuario.USUARIO_DELEGADO,
    RolUsuario.COORDINADOR,
    RolUsuario.ADMINISTRADOR,
  )
  @ApiOperation({ summary: 'Listar adjuntos de una solicitud BPM' })
  @ApiResponse({ status: 200, description: 'Lista de adjuntos de la solicitud.' })
  listarAdjuntos(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.solicitudesBpmService.listarAdjuntos(id, user);
  }

  @Delete('adjuntos/:adjuntoId')
  @Roles(RolUsuario.ADMINISTRADOR_EMPRESA, RolUsuario.USUARIO_DELEGADO)
  @ApiOperation({ summary: 'Eliminar un adjunto de una solicitud BPM en borrador' })
  @ApiResponse({ status: 200, description: 'Adjunto eliminado exitosamente.' })
  eliminarAdjunto(@Param('adjuntoId') adjuntoId: string, @CurrentUser() user: JwtPayload) {
    return this.solicitudesBpmService.eliminarAdjunto(adjuntoId, user);
  }
}
