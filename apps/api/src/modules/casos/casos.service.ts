import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/token.service';

const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];

@Injectable()
export class CasosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(user: JwtPayload) {
    const where = ROLES_INTERNOS.includes(user.rol)
      ? {}
      : { establecimiento: { idEmpresa: user.empresaId ? BigInt(user.empresaId) : undefined } };

    const casos = await this.prisma.caso.findMany({
      where,
      include: {
        establecimiento: { select: { nombre: true, idEmpresa: true } },
        origen: true,
        asignaciones: { where: { estado: 'Asignado' }, include: { evaluador: { select: { nombreCompleto: true } } } },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
    return casos.map((c) => this.serializar(c));
  }

  async obtener(id: string) {
    const caso = await this.prisma.caso.findUnique({
      where: { id: BigInt(id) },
      include: {
        establecimiento: { include: { empresa: true } },
        solicitud: true,
        alerta: true,
        denuncia: true,
        programacion: true,
        evaluaciones: true,
        expediente: true,
      },
    });
    return caso ? this.serializar(caso) : null;
  }

  private serializar(c: any) {
    return { ...c, id: c.id.toString(), idEstablecimiento: c.idEstablecimiento.toString() };
  }
}
