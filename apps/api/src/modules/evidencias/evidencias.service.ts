import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { SubirEvidenciaDto } from './dto/subir-evidencia.dto';

@Injectable()
export class EvidenciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async subir(file: Express.Multer.File, dto: SubirEvidenciaDto, tecnicoId: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({ where: { id: BigInt(dto.evaluacionId) } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');
    if (evaluacion.idEvaluador.toString() !== tecnicoId) {
      throw new ForbiddenException('Esta evaluación no está asignada a usted.');
    }
    if (evaluacion.bloqueada) {
      throw new ForbiddenException('La evaluación está bloqueada; no se pueden añadir evidencias.');
    }

    const { claveArchivo } = await this.storage.guardar(file.buffer, file.mimetype);

    const evidencia = await this.prisma.evidencia.create({
      data: {
        idEvaluacion: evaluacion.id,
        idRespuestaItem: dto.respuestaItemId ? BigInt(dto.respuestaItemId) : undefined,
        tipo: dto.tipo,
        nombreArchivo: file.originalname || claveArchivo,
        rutaAlmacenamiento: claveArchivo,
        tipoMime: file.mimetype,
        tamanoBytes: BigInt(file.size),
        latitud: dto.latitud,
        longitud: dto.longitud,
      },
    });
    return { ...evidencia, id: evidencia.id.toString(), idEvaluacion: evidencia.idEvaluacion.toString(), tamanoBytes: evidencia.tamanoBytes?.toString() };
  }

  async eliminar(evidenciaId: string, tecnicoId: string) {
    const evidencia = await this.prisma.evidencia.findUnique({
      where: { id: BigInt(evidenciaId) },
      include: { evaluacion: true },
    });
    if (!evidencia) throw new NotFoundException('Evidencia no encontrada.');
    if (evidencia.evaluacion.idEvaluador.toString() !== tecnicoId) {
      throw new ForbiddenException('Esta evidencia no pertenece a una evaluación asignada a usted.');
    }
    if (evidencia.evaluacion.bloqueada) {
      throw new ForbiddenException('La evaluación está bloqueada; no se pueden eliminar evidencias.');
    }

    if (evidencia.rutaAlmacenamiento) {
      await this.storage.eliminar(evidencia.rutaAlmacenamiento);
    }

    await this.prisma.evidencia.delete({
      where: { id: evidencia.id },
    });

    return { mensaje: 'Evidencia eliminada correctamente.' };
  }
}
