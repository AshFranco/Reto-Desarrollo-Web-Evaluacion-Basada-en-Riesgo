import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/token.service';
import { PdfService } from '../../common/services/pdf.service';
import { mapearResultadoDestacado, mapearNoConformidades } from '../../common/utils/informe-pdf-mapper';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

const ROLES_INTERNOS = ['ADMINISTRADOR', 'COORDINADOR', 'TECNICO_EVALUADOR'];

@Injectable()
export class ExpedientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async generarPdf(casoId: string): Promise<Buffer> {
    const caso = await this.prisma.caso.findUnique({
      where: { id: BigInt(casoId) },
      include: {
        establecimiento: { include: { empresa: true } },
        expediente: true,
        evaluaciones: {
          include: {
            estado: true,
            calculoRiesgo: { include: { nivelRiesgo: true } },
            informe: true,
            respuestas: { include: { itemFicha: true, opcionRespuesta: true, criticidad: true } },
          },
        },
        origen: true,
      },
    });

    if (!caso) throw new NotFoundException('Caso no encontrado.');
    if (!caso.expediente) throw new NotFoundException('El caso aún no posee un expediente registrado.');

    const expediente = caso.expediente;
    const evaluacionAprobada = caso.evaluaciones.find((e) => e.estado?.codigo === 'CERRADA' || e.estado?.codigo === 'APROBADA');

    return this.pdfService.generarDocumentoPdf({
      titulo: 'EXPEDIENTE Y DICTAMEN DE CIERRE DE EVALUACION',
      subtitulo: `Establecimiento: ${caso.establecimiento.nombre}`,
      metadata: [
        { etiqueta: 'ID Expediente', valor: expediente.id.toString() },
        { etiqueta: 'ID Caso', valor: caso.id.toString() },
        { etiqueta: 'Estado Expediente', valor: expediente.estado },
        { etiqueta: 'Resultado Final', valor: expediente.resultadoFinal ?? 'N/A' },
        { etiqueta: 'Fecha de Cierre', valor: expediente.fechaCierre?.toISOString().split('T')[0] ?? 'N/A' },
        { etiqueta: 'Empresa', valor: caso.establecimiento.empresa.razonSocial },
        { etiqueta: 'RNC Empresa', valor: caso.establecimiento.empresa.rnc },
        { etiqueta: 'Origen del Caso', valor: caso.origen?.nombre ?? 'N/A' },
      ],
      resultado: mapearResultadoDestacado(evaluacionAprobada?.calculoRiesgo),
      noConformidades: mapearNoConformidades(evaluacionAprobada?.respuestas ?? []),
      secciones: [
        {
          titulo: 'Dictamen Oficial',
          contenido: `El expediente correspondiente al caso #${caso.id} ha sido dictaminado con resultado final: ${expediente.resultadoFinal ?? 'N/A'}.`,
        },
        {
          titulo: 'Detalles de Evaluacion Aprobada',
          contenido: evaluacionAprobada?.informe?.resumenEjecutivo ?? 'Evaluacion finalizada y archivada correctamente en el sistema EBR.',
        },
      ],
    });
  }

  async cerrar(casoId: string) {
    const caso = await this.prisma.caso.findUnique({
      where: { id: BigInt(casoId) },
      include: { evaluaciones: true, expediente: true, establecimiento: { select: { idEmpresa: true } } },
    });
    if (!caso) throw new NotFoundException('Caso no encontrado.');

    const estadoAprobada = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'APROBADA' } });
    const evaluacionAprobada = caso.evaluaciones.find((e) => e.idEstado === estadoAprobada.id);
    if (!evaluacionAprobada) {
      throw new BadRequestException('El caso no tiene una evaluación aprobada por el Coordinador; no puede cerrarse.');
    }
    if (caso.expediente?.estado === 'Cerrado') {
      throw new BadRequestException('El expediente ya está cerrado.');
    }

    const calculo = await this.prisma.calculoRiesgo.findUnique({ where: { idEvaluacion: evaluacionAprobada.id } });

    return this.prisma.$transaction(async (tx) => {
      const expediente = await tx.expediente.upsert({
        where: { idCaso: BigInt(casoId) },
        create: {
          idCaso: BigInt(casoId),
          estado: 'Cerrado',
          resultadoFinal: calculo?.calificacionTexto && calculo.porcentajeCumplimiento
            ? `${calculo.calificacionTexto} (${Number(calculo.porcentajeCumplimiento).toFixed(2)}%)`
            : calculo?.calificacionTexto,
          fechaCierre: new Date(),
        },
        update: {
          estado: 'Cerrado',
          resultadoFinal: calculo?.calificacionTexto && calculo.porcentajeCumplimiento
            ? `${calculo.calificacionTexto} (${Number(calculo.porcentajeCumplimiento).toFixed(2)}%)`
            : calculo?.calificacionTexto,
          fechaCierre: new Date(),
        },
      });

      await tx.caso.update({ where: { id: BigInt(casoId) }, data: { estado: 'Cerrado' } });

      const estadoCerrada = await tx.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'CERRADA' } });
      await tx.evaluacion.update({ where: { id: evaluacionAprobada.id }, data: { idEstado: estadoCerrada.id } });

      return { ...expediente, id: expediente.id.toString(), idCaso: expediente.idCaso.toString() };
    }).then(async (resultado) => {
      await this.notificaciones.notificarPorEmpresa(caso.establecimiento.idEmpresa, {
        tipo: 'EXPEDIENTE_CERRADO',
        titulo: 'Expediente cerrado',
        mensaje: `El expediente del caso #${casoId} fue cerrado. Resultado: ${resultado.resultadoFinal ?? 'N/A'}.`,
        entidad: 'expediente',
        idEntidad: resultado.id,
      });
      return resultado;
    });
  }

  async reabrir(casoId: string) {
    const caso = await this.prisma.caso.findUnique({
      where: { id: BigInt(casoId) },
      include: {
        evaluaciones: {
          include: { estado: true },
        },
        expediente: true,
      },
    });
    if (!caso) throw new NotFoundException('Caso no encontrado.');

    const estaCerradoExpediente = caso.expediente?.estado?.toLowerCase() === 'cerrado';
    const estaCerradoCaso = caso.estado?.toLowerCase() === 'cerrado';
    if (!estaCerradoExpediente && !estaCerradoCaso) {
      throw new BadRequestException('El expediente no se encuentra cerrado; no puede reabrirse.');
    }

    const estadoCerrada = await this.prisma.estadoEvaluacion.findUnique({ where: { codigo: 'CERRADA' } });
    const evaluacionCerrada = caso.evaluaciones.find(
      (e) => (estadoCerrada && e.idEstado === estadoCerrada.id) || e.estado?.codigo === 'CERRADA'
    );
    const estadoAprobada = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'APROBADA' } });

    return this.prisma.$transaction(async (tx) => {
      const expediente = await tx.expediente.upsert({
        where: { idCaso: BigInt(casoId) },
        create: {
          idCaso: BigInt(casoId),
          estado: 'Abierto',
          fechaCierre: null,
        },
        update: {
          estado: 'Abierto',
          fechaCierre: null,
        },
      });

      await tx.caso.update({ where: { id: BigInt(casoId) }, data: { estado: 'Asignado' } });

      if (evaluacionCerrada) {
        await tx.evaluacion.update({
          where: { id: evaluacionCerrada.id },
          data: { idEstado: estadoAprobada.id },
        });
      }

      return { ...expediente, id: expediente.id.toString(), idCaso: expediente.idCaso.toString() };
    });
  }

  /**
   * Roles internos (Admin/Coordinador/Tecnico) pueden ver todo, y filtrar
   * opcionalmente por empresa con el query param. Roles de empresa SOLO
   * pueden ver los suyos -- el server IGNORA cualquier empresaId que el
   * cliente intente mandar y fuerza el propio, para que no se pueda pedir
   * el de otra empresa cambiando el parametro.
   */
  async buscar(filtros: { empresaId?: string; estado?: string; desde?: string; hasta?: string }, user: JwtPayload) {
    let empresaIdEfectivo: string | undefined;

    if (ROLES_INTERNOS.includes(user.rol)) {
      empresaIdEfectivo = filtros.empresaId;
    } else {
      if (!user.empresaId) {
        throw new ForbiddenException('Su usuario no está vinculado a ninguna empresa.');
      }
      empresaIdEfectivo = user.empresaId; // se ignora filtros.empresaId a propósito
    }

    const expedientes = await this.prisma.expediente.findMany({
      where: {
        estado: filtros.estado,
        fechaCierre: {
          gte: filtros.desde ? new Date(filtros.desde) : undefined,
          lte: filtros.hasta ? new Date(filtros.hasta) : undefined,
        },
        caso: empresaIdEfectivo
          ? { establecimiento: { idEmpresa: BigInt(empresaIdEfectivo) } }
          : undefined,
      },
      include: { caso: { include: { establecimiento: { include: { empresa: true } } } } },
      orderBy: { fechaCierre: 'desc' },
    });
    return expedientes.map((e) => ({ ...e, id: e.id.toString(), idCaso: e.idCaso.toString() }));
  }
}
