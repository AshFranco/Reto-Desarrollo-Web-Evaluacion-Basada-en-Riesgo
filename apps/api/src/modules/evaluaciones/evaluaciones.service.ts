import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RegistrarRespuestasDto,
  FinalizarEvaluacionDto,
} from './dto/registrar-respuestas.dto';
import { RolUsuario } from '../../common/enums';
import { NotificacionesService } from '../notificaciones/notificaciones.service';


/**
 * Captura de la Ficha BPM, adaptada al esquema oficial:
 *  - `respuesta_item` en vez de `respuesta_evaluacion`.
 *  - `id_criticidad` vive en la RESPUESTA (no en el catálogo del ítem):
 *    el técnico la asigna solo cuando hay un hallazgo (CP/IT).
 *  - El cálculo final (%, NC, aprueba, etc.) se persiste en `calculo_riesgo`
 *    vía MotorRiesgoService, no aquí -- este servicio solo captura y
 *    bloquea. Ver motor-riesgo.service.ts.
 */
@Injectable()
export class EvaluacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** RF-04 (Dashboard Técnico) / RF-11 (Calendario): lista las evaluaciones del técnico. */
  async listarMias(tecnicoId: string) {
    const evaluaciones = await this.prisma.evaluacion.findMany({
      where: { idEvaluador: BigInt(tecnicoId) },
      include: { establecimiento: { select: { nombre: true, calle: true } }, estado: true },
      orderBy: { id: 'desc' },
    });
    return evaluaciones.map((e) => this.serializar(e));
  }

  /** Detalle de una evaluación, necesario antes de "iniciar" (para pintar la ficha). */
  async obtener(evaluacionId: string, tecnicoId: string) {
    const evaluacion = await this.obtenerYValidarPropiedad(evaluacionId, tecnicoId);
    const detalle = await this.prisma.evaluacion.findUnique({
      where: { id: evaluacion.id },
      include: {
        establecimiento: { include: { empresa: true } },
        versionFicha: true,
        estado: true,
        respuestas: true,
        evidencias: true,
        historialEstados: { orderBy: { fechaHora: 'desc' }, take: 1 },
        caso: { select: { id: true, estado: true } },
        calculoRiesgo: true,
      },
    });

    // DEVOLVER y SOLICITAR_CORRECCION comparten el mismo estado (DEVUELTA)
    // en el catálogo -- la acción real elegida por el Coordinador se
    // recupera del último registro de historial (ver informes.service.ts).
    let ultimaAccionCoordinador: string | null = null;
    const ultimoHistorial = detalle?.historialEstados[0];
    if (ultimoHistorial?.comentario?.startsWith('[')) {
      ultimaAccionCoordinador = ultimoHistorial.comentario.slice(1, ultimoHistorial.comentario.indexOf(']'));
    }

    return { ...this.serializar(detalle), ultimaAccionCoordinador };
  }

  async iniciar(evaluacionId: string, tecnicoId: string) {
    const evaluacion = await this.obtenerYValidarPropiedad(evaluacionId, tecnicoId);
    const estadoProgramada = await this.prisma.estadoEvaluacion.findUniqueOrThrow({
      where: { codigo: 'PROGRAMADA' },
    });
    if (evaluacion.idEstado !== estadoProgramada.id) {
      throw new BadRequestException('La evaluación ya fue iniciada o finalizada.');
    }

    const estadoEnCurso = await this.prisma.estadoEvaluacion.findUniqueOrThrow({
      where: { codigo: 'EN_CURSO' },
    });
    const actualizada = await this.prisma.evaluacion.update({
      where: { id: BigInt(evaluacionId) },
      data: { idEstado: estadoEnCurso.id, fechaInicio: new Date() },
    });
    await this.registrarHistorial(actualizada.id, evaluacion.idEstado, estadoEnCurso.id, tecnicoId);
    return this.serializar(actualizada);
  }

  async registrarRespuestas(evaluacionId: string, tecnicoId: string, dto: RegistrarRespuestasDto) {
    const evaluacion = await this.obtenerYValidarPropiedad(evaluacionId, tecnicoId);
    if (evaluacion.bloqueada) {
      throw new ForbiddenException('Esta evaluación ya fue enviada y sus datos están bloqueados.');
    }

    const opciones = await this.prisma.opcionRespuesta.findMany({
      where: { idVersionFicha: evaluacion.idVersionFicha },
    });
    const opcionPorCodigo = new Map(opciones.map((o) => [o.codigo, o]));
    const criticidades = await this.prisma.nivelCriticidad.findMany();
    const criticidadPorCodigo = new Map(criticidades.map((c) => [c.codigo, c]));

    for (const r of dto.respuestas) {
      const requiereCriticidad = r.codigoOpcion === 'IT' || r.codigoOpcion === 'CP';
      if (requiereCriticidad && !r.nivelCriticidad) {
        throw new BadRequestException(
          `Debe indicar el nivel de criticidad (C/M/Me) para el ítem con hallazgo: ${r.itemId}`,
        );
      }
    }

    await this.prisma.$transaction(
      dto.respuestas.map((r) => {
        const opcion = opcionPorCodigo.get(r.codigoOpcion);
        if (!opcion) throw new BadRequestException(`Opción de respuesta inválida: ${r.codigoOpcion}`);
        const criticidad = r.nivelCriticidad ? criticidadPorCodigo.get(r.nivelCriticidad) : undefined;

        return this.prisma.respuestaItem.upsert({
          where: { uq_respuesta_item: { idEvaluacion: BigInt(evaluacionId), idItemFicha: BigInt(r.itemId) } },
          create: {
            idEvaluacion: BigInt(evaluacionId),
            idItemFicha: BigInt(r.itemId),
            idOpcionRespuesta: opcion.id,
            valorAplicado: opcion.valor,
            excluidoDelCalculo: opcion.excluyeDelCalculo,
            idCriticidad: criticidad?.id,
            observacion: r.observacion,
          },
          update: {
            idOpcionRespuesta: opcion.id,
            valorAplicado: opcion.valor,
            excluidoDelCalculo: opcion.excluyeDelCalculo,
            idCriticidad: criticidad?.id,
            observacion: r.observacion,
          },
        });
      }),
    );

    return { mensaje: 'Avance guardado.' };
  }

  /**
   * Finaliza y BLOQUEA la evaluación (RF-17). El cálculo completo (%
   * cumplimiento, NC, riesgo) se dispara aparte contra el endpoint del
   * Motor de Riesgo, que también necesita las selecciones de los factores
   * de establecimiento no automáticos.
   */
  async finalizar(evaluacionId: string, tecnicoId: string, _dto: FinalizarEvaluacionDto) {
    const evaluacion = await this.obtenerYValidarPropiedad(evaluacionId, tecnicoId);
    if (evaluacion.bloqueada) {
      throw new ForbiddenException('Esta evaluación ya fue enviada previamente.');
    }

    const versionFicha = await this.prisma.versionFicha.findUniqueOrThrow({
      where: { id: evaluacion.idVersionFicha },
    });
    const totalItemsEvaluables = await this.prisma.itemFicha.count({
      where: { idVersionFicha: evaluacion.idVersionFicha, esEvaluable: true },
    });
    const respuestasCapturadas = await this.prisma.respuestaItem.count({
      where: { idEvaluacion: BigInt(evaluacionId) },
    });
    if (respuestasCapturadas < totalItemsEvaluables) {
      throw new BadRequestException(
        `Faltan respuestas: ${respuestasCapturadas}/${totalItemsEvaluables} ítems respondidos.`,
      );
    }

    const estadoFinalizada = await this.prisma.estadoEvaluacion.findUniqueOrThrow({
      where: { codigo: 'FINALIZADA' },
    });

    const actualizada = await this.prisma.evaluacion.update({
      where: { id: BigInt(evaluacionId) },
      data: {
        idEstado: estadoFinalizada.id,
        fechaFinalizacion: new Date(),
        bloqueada: true,
      },
    });
    await this.registrarHistorial(actualizada.id, evaluacion.idEstado, estadoFinalizada.id, tecnicoId);
    return this.serializar(actualizada);
  }

  /**
   * Reabre una evaluación previamente finalizada para permitir volver a editarla
   * (Principio de Heurística de Jakob Nielsen: Control y Libertad del Usuario),
   * siempre que el caso no haya sido cerrado formalmente por Coordinación.
   */
  async reabrir(evaluacionId: string, usuarioId: string, rol: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({
      where: { id: BigInt(evaluacionId) },
      include: { caso: true },
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');
    if (rol === RolUsuario.TECNICO_EVALUADOR && evaluacion.idEvaluador?.toString() !== usuarioId) {
      throw new ForbiddenException('No tienes permiso para reabrir esta evaluación.');
    }
    if (evaluacion.caso?.estado === 'Cerrado') {
      throw new BadRequestException('No se puede reabrir una evaluación de un caso que ya ha sido cerrado.');
    }

    const estadoEnCurso = await this.prisma.estadoEvaluacion.findUniqueOrThrow({
      where: { codigo: 'EN_CURSO' },
    });

    const actualizada = await this.prisma.evaluacion.update({
      where: { id: BigInt(evaluacionId) },
      data: {
        idEstado: estadoEnCurso.id,
        bloqueada: false,
      },
    });

    await this.registrarHistorial(actualizada.id, evaluacion.idEstado, estadoEnCurso.id, usuarioId);
    return this.serializar(actualizada);
  }


  private async registrarHistorial(
    idEvaluacion: bigint,
    idEstadoOrigen: number | null,
    idEstadoDestino: number,
    idUsuario: string,
  ) {
    await this.prisma.historialEstado.create({
      data: {
        idEvaluacion,
        idEstadoOrigen: idEstadoOrigen ?? undefined,
        idEstadoDestino,
        idUsuario: BigInt(idUsuario),
      },
    });
  }

  private async obtenerYValidarPropiedad(evaluacionId: string, tecnicoId: string) {
    const evaluacion = await this.prisma.evaluacion.findUnique({ where: { id: BigInt(evaluacionId) } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada.');
    if (evaluacion.idEvaluador.toString() !== tecnicoId) {
      throw new ForbiddenException('Esta evaluación no está asignada a usted.');
    }
    return evaluacion;
  }

  async obtenerObservaciones(evaluacionId: string, tecnicoId: string) {
    const evaluacion = await this.obtenerYValidarPropiedad(evaluacionId, tecnicoId);
    const historial = await this.prisma.historialEstado.findMany({
      where: { idEvaluacion: evaluacion.id },
      include: { usuario: { select: { nombreCompleto: true } }, estadoDestino: true },
      orderBy: { fechaHora: 'desc' },
    });
    return historial.map((h) => ({
      id: h.id.toString(),
      estado: h.estadoDestino.nombre,
      codigoEstado: h.estadoDestino.codigo,
      usuario: h.usuario.nombreCompleto,
      comentario: h.comentario,
      fechaHora: h.fechaHora,
    }));
  }

  async corregir(evaluacionId: string, tecnicoId: string, dto: RegistrarRespuestasDto) {
    const evaluacion = await this.obtenerYValidarPropiedad(evaluacionId, tecnicoId);
    
    if (evaluacion.bloqueada) {
      await this.prisma.evaluacion.update({
        where: { id: evaluacion.id },
        data: { bloqueada: false },
      });
    }

    await this.registrarRespuestas(evaluacionId, tecnicoId, dto);

    const estadoEnCurso = await this.prisma.estadoEvaluacion.findUniqueOrThrow({
      where: { codigo: 'EN_CURSO' },
    });

    const actualizada = await this.prisma.evaluacion.update({
      where: { id: evaluacion.id },
      data: {
        idEstado: estadoEnCurso.id,
        versionRegistro: { increment: 1 },
      },
    });

    await this.registrarHistorial(evaluacion.id, evaluacion.idEstado, estadoEnCurso.id, tecnicoId);

    if (actualizada.idCoordinador) {
      await this.notificaciones.crear({
        idUsuario: actualizada.idCoordinador,
        tipo: 'CORRECCION_REENVIADA',
        titulo: 'Corrección reenviada',
        mensaje: `El técnico reenvió correcciones de la evaluación #${evaluacionId} para su revisión.`,
        entidad: 'evaluacion',
        idEntidad: actualizada.id,
      });
    }

    return { mensaje: 'Correcciones registradas exitosamente.', evaluacion: this.serializar(actualizada) };
  }

  private serializar(e: any) {
    if (!e) return e;
    return {
      ...e,
      id: e.id?.toString(),
      idEvaluador: e.idEvaluador?.toString(),
      respuestas: e.respuestas?.map((r: any) => ({
        ...r,
        id: r.id?.toString(),
        idEvaluacion: r.idEvaluacion?.toString(),
        idItemFicha: r.idItemFicha?.toString(),
        idOpcionRespuesta: r.idOpcionRespuesta?.toString(),
      })),
      evidencias: e.evidencias?.map((ev: any) => ({
        ...ev,
        id: ev.id?.toString(),
        idEvaluacion: ev.idEvaluacion?.toString(),
        idRespuestaItem: ev.idRespuestaItem ? ev.idRespuestaItem.toString() : null,
        tamanoBytes: ev.tamanoBytes ? ev.tamanoBytes.toString() : null,
      })),
      caso: e.caso
        ? {
            id: e.caso.id?.toString(),
            estado: e.caso.estado,
          }
        : null,
      calculoRiesgo: e.calculoRiesgo
        ? {
            ...e.calculoRiesgo,
            id: e.calculoRiesgo.id?.toString(),
            idEvaluacion: e.calculoRiesgo.idEvaluacion?.toString(),
            idSubcategoriaRp: e.calculoRiesgo.idSubcategoriaRp?.toString(),
            idRangoCalificacion: e.calculoRiesgo.idRangoCalificacion?.toString(),
            porcentajeCumplimiento: e.calculoRiesgo.porcentajeCumplimiento?.toString(),
            rpValor: e.calculoRiesgo.rpValor?.toString(),
            reValor: e.calculoRiesgo.reValor?.toString(),
            rtValor: e.calculoRiesgo.rtValor?.toString(),
            puntosObtenidos: e.calculoRiesgo.puntosObtenidos?.toString(),
            puntosExcluidosNa: e.calculoRiesgo.puntosExcluidosNa?.toString(),
            puntajeTotalPosible: e.calculoRiesgo.puntajeTotalPosible?.toString(),
            denominadorEfectivo: e.calculoRiesgo.denominadorEfectivo?.toString(),
          }
        : null,
    };
  }
}
