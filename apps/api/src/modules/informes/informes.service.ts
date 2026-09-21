import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerarInformeDto, RevisarInformeDto } from './dto/informe.dto';
import { PdfService } from '../../common/services/pdf.service';
import { mapearResultadoDestacado, mapearNoConformidades } from '../../common/utils/informe-pdf-mapper';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { verificarAccesoEmpresa } from '../../common/utils/aislamiento-empresa';
import type { JwtPayload } from '../auth/token.service';

import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class InformesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async generarPdf(evaluacionId: string, user: JwtPayload): Promise<Buffer> {
    const evaluacion = await this.prisma.evaluacion.findUnique({
      where: { id: BigInt(evaluacionId) },
      include: {
        evaluador: true,
        coordinador: true,
        estado: true,
        establecimiento: { include: { empresa: true } },
        informe: true,
        calculoRiesgo: { include: { nivelRiesgo: true } },
        respuestas: {
          include: { itemFicha: true, opcionRespuesta: true, criticidad: true },
        },
      },
    });

    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');
    verificarAccesoEmpresa(user, evaluacion.establecimiento.idEmpresa);

    const informe = evaluacion.informe;
    const anio = new Date().getFullYear();
    const codigoDoc = `F-BPM-${anio}-${evaluacion.id.toString().padStart(4, '0')}`;
    const qrUrl = `https://sinec.msp.gob.do/verificar/informe/${evaluacion.id}`;

    return this.pdfService.generarDocumentoPdf({
      titulo: 'FICHA OFICIAL DE INSPECCIÓN Y EVALUACIÓN BPM',
      subtitulo: `Establecimiento: ${evaluacion.establecimiento.nombre}`,
      codigo: codigoDoc,
      version: '2026-Rev-BPM-RD',
      metadataTitulo: 'DATOS DEL ESTABLECIMIENTO Y CONTACTOS',
      metadata: [
        { etiqueta: 'ID Evaluación', valor: evaluacion.id.toString() },
        { etiqueta: 'Establecimiento', valor: evaluacion.establecimiento.nombre },
        { etiqueta: 'Empresa Titular', valor: evaluacion.establecimiento.empresa.razonSocial },
        { etiqueta: 'RNC Empresa', valor: evaluacion.establecimiento.empresa.rnc },
        { etiqueta: 'Fecha Programada', valor: evaluacion.fechaProgramada?.toISOString().split('T')[0] ?? 'N/A' },
        { etiqueta: 'Estado Evaluación', valor: evaluacion.estado?.nombre ?? 'N/A' },
        { etiqueta: 'Técnico Evaluador', valor: evaluacion.evaluador?.nombreCompleto ?? 'N/A' },
        { etiqueta: 'Calificación Riesgo', valor: evaluacion.calculoRiesgo?.calificacionTexto ?? 'N/A' },
      ],
      metadataControlTitulo: 'DATOS DE CONTROL INTERNO Y FISCALIZACIÓN',
      metadataControl: [
        { etiqueta: 'Código Ficha', valor: codigoDoc },
        { etiqueta: 'Tipo de Evaluación', valor: 'Vigilancia Sanitaria Regular BPM' },
        { etiqueta: 'Coordinador Revisor', valor: evaluacion.coordinador?.nombreCompleto ?? 'Dirección Técnica DIGEMAPS' },
        {
          etiqueta: 'Frecuencia Fiscalización',
          valor: evaluacion.calculoRiesgo?.nivelRiesgo?.nombre
            ? `${evaluacion.calculoRiesgo.nivelRiesgo.nombre} (Fiscalización Regular)`
            : 'Anual (Riesgo Bajo)',
        },
      ],
      resultado: mapearResultadoDestacado(evaluacion.calculoRiesgo),
      noConformidades: mapearNoConformidades(evaluacion.respuestas),
      secciones: [
        { titulo: 'Resumen Ejecutivo', contenido: informe?.resumenEjecutivo ?? 'Sin resumen registrado.' },
        { titulo: 'Hallazgos', contenido: informe?.hallazgos ?? 'Sin hallazgos registrados.' },
        { titulo: 'No Conformidades', contenido: informe?.noConformidades ?? 'Sin no conformidades registradas.' },
        { titulo: 'Recomendaciones', contenido: informe?.recomendaciones ?? 'Sin recomendaciones registradas.' },
      ],
      incluirSello: true,
      incluirQr: true,
      qrUrl,
      incluirFirma: true,
      tecnicoNombre: evaluacion.evaluador?.nombreCompleto ?? 'Lic. Roberto Morales',
      tecnicoCargo: 'Técnico Evaluador Autorizado BPM',
      coordinadorNombre: evaluacion.coordinador?.nombreCompleto ?? 'Ing. Carlos Peña',
      coordinadorCargo: 'Coordinador Técnico DIGEMAPS',
    });
  }

  async generar(dto: GenerarInformeDto, tecnicoId: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({
      where: { id: BigInt(dto.evaluacionId) },
      include: {
        establecimiento: { select: { nombre: true } },
        evaluador: { select: { nombreCompleto: true } },
      },
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');
    if (evaluacion.idEvaluador.toString() !== tecnicoId) {
      throw new ForbiddenException('Esta evaluación no está asignada a usted.');
    }

    const estadoFinalizada = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'FINALIZADA' } });
    const estadoDevuelta = await this.prisma.estadoEvaluacion.findUnique({ where: { codigo: 'DEVUELTA' } });
    const estadosPermitidos = [estadoFinalizada.id, ...(estadoDevuelta ? [estadoDevuelta.id] : [])];

    if (!evaluacion.idEstado || !estadosPermitidos.includes(evaluacion.idEstado)) {
      throw new BadRequestException('Solo se puede generar o reenviar el informe de una evaluación finalizada o devuelta para corrección.');
    }

    const informe = await this.prisma.informeEvaluacion.upsert({
      where: { idEvaluacion: BigInt(dto.evaluacionId) },
      create: {
        idEvaluacion: BigInt(dto.evaluacionId),
        resumenEjecutivo: dto.resumenEjecutivo,
        hallazgos: dto.hallazgos,
        noConformidades: dto.noConformidades,
        recomendaciones: dto.recomendaciones,
      },
      update: {
        resumenEjecutivo: dto.resumenEjecutivo,
        hallazgos: dto.hallazgos,
        noConformidades: dto.noConformidades,
        recomendaciones: dto.recomendaciones,
      },
    });

    const estadoEnRevision = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'EN_REVISION' } });
    await this.prisma.evaluacion.update({
      where: { id: BigInt(dto.evaluacionId) },
      data: { idEstado: estadoEnRevision.id },
    });

    await this.auditoriaService.registrar({
      entidad: 'Evaluacion',
      idEntidad: dto.evaluacionId,
      accion: 'GENERAR_INFORME',
      idUsuario: tecnicoId,
      valoresNuevos: { resumenEjecutivo: dto.resumenEjecutivo, hallazgos: dto.hallazgos },
    });

    try {
      const nombreEstablecimiento = (evaluacion as any).establecimiento?.nombre ?? 'Establecimiento';
      const nombreTecnico = (evaluacion as any).evaluador?.nombreCompleto ?? 'El técnico evaluador';

      await this.notificaciones.notificarPorRol('ADMINISTRADOR', {
        tipo: 'INFORME_EN_REVISION',
        titulo: 'Informe técnico generado',
        mensaje: `${nombreTecnico} generó el informe de la evaluación #${dto.evaluacionId} (${nombreEstablecimiento}), en revisión.`,
        entidad: 'evaluacion',
        idEntidad: dto.evaluacionId,
      });

      if (evaluacion.idCoordinador) {
        await this.notificaciones.crear({
          idUsuario: evaluacion.idCoordinador,
          tipo: 'INFORME_EN_REVISION',
          titulo: 'Informe técnico pendiente de revisión',
          mensaje: `El informe técnico de la evaluación #${dto.evaluacionId} (${nombreEstablecimiento}) está listo para su revisión.`,
          entidad: 'evaluacion',
          idEntidad: dto.evaluacionId,
        });
      } else {
        await this.notificaciones.notificarPorRol('COORDINADOR', {
          tipo: 'INFORME_EN_REVISION',
          titulo: 'Informe técnico pendiente de revisión',
          mensaje: `El informe técnico de la evaluación #${dto.evaluacionId} (${nombreEstablecimiento}) está listo para su revisión.`,
          entidad: 'evaluacion',
          idEntidad: dto.evaluacionId,
        });
      }
    } catch {
      // La notificación no bloquea la respuesta
    }

    return { ...informe, id: informe.id.toString(), idEvaluacion: informe.idEvaluacion.toString() };
  }

  /**
   * NOTA sobre DEVOLVER vs SOLICITAR_CORRECCION: el catálogo estado_evaluacion
   * no tiene un estado separado para "en corrección" -- ambas acciones
   * llevan a la evaluación al mismo estado DEVUELTA. Para que el frontend
   * pueda distinguir cuál de las dos eligió el Coordinador (sin tocar el
   * catálogo ni el esquema), se guarda la acción real como prefijo del
   * comentario en historial_estado, y se devuelve explícita en la
   * respuesta de este endpoint.
   */
  async revisar(evaluacionId: string, dto: RevisarInformeDto, coordinadorId: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({ where: { id: BigInt(evaluacionId) } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');

    const estadoEnRevision = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'EN_REVISION' } });
    if (evaluacion.idEstado !== estadoEnRevision.id) {
      throw new BadRequestException('La evaluación no está en revisión.');
    }

    const nuevoEstadoCodigo = dto.accion === 'APROBAR' ? 'APROBADA' : 'DEVUELTA';
    const nuevoEstado = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: nuevoEstadoCodigo } });

    const comentarioConAccion = `[${dto.accion}] ${dto.observaciones ?? ''}`.trim();

    const resultado = await this.prisma.$transaction(async (tx) => {
      await tx.historialEstado.create({
        data: {
          idEvaluacion: BigInt(evaluacionId),
          idEstadoOrigen: estadoEnRevision.id,
          idEstadoDestino: nuevoEstado.id,
          idUsuario: BigInt(coordinadorId),
          comentario: comentarioConAccion,
        },
      });

      const actualizada = await tx.evaluacion.update({
        where: { id: BigInt(evaluacionId) },
        data: { idEstado: nuevoEstado.id, idCoordinador: BigInt(coordinadorId), fechaRevision: new Date() },
      });
      return { ...actualizada, id: actualizada.id.toString(), accion: dto.accion };
    }).then(async (resultado) => {
      const esAprobacion = dto.accion === 'APROBAR';
      await this.notificaciones.crear({
        idUsuario: evaluacion.idEvaluador,
        tipo: esAprobacion ? 'INFORME_APROBADO' : 'INFORME_DEVUELTO',
        titulo: esAprobacion ? 'Informe aprobado' : 'Informe devuelto para corrección',
        mensaje: esAprobacion
          ? `Su informe de la evaluación #${evaluacionId} fue aprobado.`
          : `Su informe de la evaluación #${evaluacionId} fue devuelto.${dto.observaciones ? ` Observaciones: ${dto.observaciones}` : ''}`,
        entidad: 'evaluacion',
        idEntidad: evaluacionId,
      });
      return resultado;
    });

    await this.auditoriaService.registrar({
      entidad: 'Evaluacion',
      idEntidad: evaluacionId,
      accion: `REVISAR_${dto.accion}`,
      idUsuario: coordinadorId,
      valoresAnteriores: { estado: 'EN_REVISION' },
      valoresNuevos: { estado: nuevoEstadoCodigo, observaciones: dto.observaciones },
    });

    return resultado;
  }

  async revertirRevision(evaluacionId: string, coordinadorId: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({ where: { id: BigInt(evaluacionId) } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');

    const estadoDevuelta = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'DEVUELTA' } });
    const estadoEnRevision = await this.prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'EN_REVISION' } });

    if (evaluacion.idEstado !== estadoDevuelta.id) {
      if (evaluacion.idEstado === estadoEnRevision.id) {
        return {
          ...evaluacion,
          id: evaluacion.id.toString(),
          mensaje: 'La evaluación ya se encuentra en estado En Revisión.',
        };
      }
      throw new BadRequestException('Solo se puede revertir una evaluación que esté en estado Devuelta.');
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      await tx.historialEstado.create({
        data: {
          idEvaluacion: BigInt(evaluacionId),
          idEstadoOrigen: estadoDevuelta.id,
          idEstadoDestino: estadoEnRevision.id,
          idUsuario: BigInt(coordinadorId),
          comentario: '[DESHACER_DEVOLUCION] Reversión de devolución a estado En Revisión.',
        },
      });

      const actualizada = await tx.evaluacion.update({
        where: { id: BigInt(evaluacionId) },
        data: { idEstado: estadoEnRevision.id },
      });

      return {
        ...actualizada,
        id: actualizada.id.toString(),
        mensaje: 'Devolución revertida exitosamente a En Revisión.',
      };
    });

    await this.auditoriaService.registrar({
      entidad: 'Evaluacion',
      idEntidad: evaluacionId,
      accion: 'REVERTIR_DEVOLUCION',
      idUsuario: coordinadorId,
      valoresAnteriores: { estado: 'DEVUELTA' },
      valoresNuevos: { estado: 'EN_REVISION' },
    });

    return resultado;
  }
}
