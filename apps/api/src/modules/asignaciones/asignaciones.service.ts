import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AsignarEvaluadorDto } from './dto/asignar-evaluador.dto';

@Injectable()
export class AsignacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async asignar(dto: AsignarEvaluadorDto, coordinadorId: string) {
    const evaluador = await this.prisma.usuario.findUnique({
      where: { id: BigInt(dto.evaluadorId) },
      include: { roles: { include: { rol: true } } },
    });
    const esEvaluador = evaluador?.roles.some((r) => r.rol.codigo === 'TECNICO_EVALUADOR');
    if (!evaluador || !esEvaluador) {
      throw new BadRequestException('El usuario indicado no es un Técnico Evaluador válido.');
    }

    const caso = await this.prisma.caso.findUnique({ where: { id: BigInt(dto.casoId) } });
    if (!caso) throw new NotFoundException('Caso no encontrado.');

    return this.prisma.$transaction(async (tx) => {
      // No hay flag "activa" en el esquema oficial; se marca la anterior
      // como "Reasignada" para dejar solo una asignación "Asignado" vigente.
      await tx.asignacionEvaluador.updateMany({
        where: { idCaso: BigInt(dto.casoId), estado: 'Asignado' },
        data: { estado: 'Reasignada' },
      });

      const asignacion = await tx.asignacionEvaluador.create({
        data: {
          idCaso: BigInt(dto.casoId),
          idEvaluador: BigInt(dto.evaluadorId),
          idCoordinador: BigInt(coordinadorId),
          estado: 'Asignado',
        },
      });

      await tx.caso.update({ where: { id: BigInt(dto.casoId) }, data: { estado: 'Asignado' } });

      return { ...asignacion, id: asignacion.id.toString(), idCaso: asignacion.idCaso.toString() };
    });
  }

  async listarPorEvaluador(evaluadorId: string) {
    const asignaciones = await this.prisma.asignacionEvaluador.findMany({
      where: { idEvaluador: BigInt(evaluadorId), estado: 'Asignado' },
      include: { caso: { include: { establecimiento: { select: { nombre: true, calle: true } } } } },
      orderBy: { fechaAsignacion: 'desc' },
    });
    return asignaciones.map((a) => ({ ...a, id: a.id.toString(), idCaso: a.idCaso.toString() }));
  }
}
