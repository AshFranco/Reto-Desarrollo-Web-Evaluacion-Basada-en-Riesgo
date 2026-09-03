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
  constructor(private readonly prisma: PrismaService) {}

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

  private serializar(e: any) {
    return { ...e, id: e.id.toString(), idEvaluador: e.idEvaluador.toString() };
  }
}
