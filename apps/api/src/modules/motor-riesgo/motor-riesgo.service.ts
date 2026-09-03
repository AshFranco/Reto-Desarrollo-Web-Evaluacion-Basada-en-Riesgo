import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CalcularRiesgoDto } from './dto/calcular-riesgo.dto';

/**
 * Motor de Riesgo (RF-14), delegado al paquete compartido `@ebr/risk-engine`
 * (IMPLEMENTACIÓN ÚNICA usada también por la PWA). Este servicio solo se
 * encarga de: leer los datos de Postgres, armarlos en el formato que el
 * paquete espera, invocarlo, y persistir el resultado en `calculo_riesgo`.
 *
 * NOTA TÉCNICA: `@ebr/risk-engine` es un paquete ESM puro (`"type": "module"`).
 * Este backend corre en CommonJS, así que se importa con `import()` dinámico
 * (no `import` estático) -- es la forma soportada por Node para consumir
 * ESM desde CommonJS.
 */
@Injectable()
export class MotorRiesgoService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularRiesgoEstablecimiento(dto: CalcularRiesgoDto) {
    const riskEngine = await import('@ebr/risk-engine');

    const evaluacion = await this.prisma.evaluacion.findUnique({
      where: { id: BigInt(dto.evaluacionId) },
      include: { establecimiento: true, versionFicha: true },
    });
    if (!evaluacion) throw new BadRequestException('Evaluación no encontrada.');

    // --- Respuestas de la ficha, en el formato del paquete ---
    const respuestasDb = await this.prisma.respuestaItem.findMany({
      where: { idEvaluacion: evaluacion.id },
      include: { opcionRespuesta: true, criticidad: true },
    });
    if (respuestasDb.length === 0) {
      throw new BadRequestException('La evaluación no tiene respuestas registradas.');
    }
    const respuestas = respuestasDb.map((r) => ({
      idItemFicha: Number(r.idItemFicha),
      opcion: {
        id: Number(r.opcionRespuesta.id),
        codigo: r.opcionRespuesta.codigo,
        valor: Number(r.opcionRespuesta.valor ?? 0),
        excluyeDelCalculo: r.opcionRespuesta.excluyeDelCalculo,
        generaNc: r.opcionRespuesta.generaNc,
      },
      peso: Number(r.pesoAplicado ?? 1),
      criticidad: (r.criticidad?.codigo as 'C' | 'M' | 'Me' | undefined) ?? null,
    }));

    // --- RP: categorías de alimento del establecimiento ---
    const categorias = await this.prisma.establecimientoCategoria.findMany({
      where: { idEstablecimiento: evaluacion.idEstablecimiento },
      include: { subcategoria: { include: { nivelResultante: true } } },
    });
    const puntajesRpCategorias = categorias
      .map((c) => c.subcategoria.nivelResultante?.puntajeRp)
      .filter((v): v is any => v != null)
      .map((v) => Number(v));

    // --- Factores de riesgo del establecimiento (manuales + automático) ---
    const factoresDb = await this.prisma.factorRiesgoEstablecimiento.findMany({
      where: { idVersionMatriz: evaluacion.idVersionMatriz },
      include: { opciones: true },
    });
    const factorAutoDb = factoresDb.find((f) => f.esAutomatico);
    if (!factorAutoDb) throw new BadRequestException('No hay un factor automático configurado en la matriz.');

    const seleccionesConOpcion: { idFactor: bigint; idOpcionFactor: bigint; puntaje: number; peso: number; numero: number; nombre: string }[] = [];
    const factoresManuales = [];

    for (const f of factoresDb) {
      if (f.esAutomatico) continue;
      const seleccion = dto.seleccionesFactores.find((s) => s.factorId === f.id.toString());
      if (!seleccion) throw new BadRequestException(`Falta la selección para el factor "${f.nombre}".`);
      const opcion = f.opciones.find((o) => o.id.toString() === seleccion.opcionId);
      if (!opcion) throw new BadRequestException(`Opción inválida para el factor "${f.nombre}".`);

      factoresManuales.push({
        numero: f.numero ?? 0,
        nombre: f.nombre,
        peso: Number(f.peso ?? 0),
        puntaje: Number(opcion.puntaje ?? 0),
        esAutomatico: false,
      });
      seleccionesConOpcion.push({
        idFactor: f.id, idOpcionFactor: opcion.id,
        puntaje: Number(opcion.puntaje ?? 0), peso: Number(f.peso ?? 0),
        numero: f.numero ?? 0, nombre: f.nombre,
      });
    }

    const opcionesFactorAuto = factorAutoDb.opciones.map((o) => ({
      id: Number(o.id),
      descripcion: o.descripcion ?? '',
      puntaje: Number(o.puntaje ?? 0),
      limiteInf: o.limiteInf != null ? Number(o.limiteInf) : null,
      limiteSup: o.limiteSup != null ? Number(o.limiteSup) : null,
    }));

    // --- Rangos de calificación (ficha) y de frecuencia (matriz) ---
    const rangosCalifDb = await this.prisma.rangoCalificacion.findMany({
      where: { idVersionFicha: evaluacion.idVersionFicha },
    });
    const rangosFrecDb = await this.prisma.rangoFrecuencia.findMany({
      where: { idVersionMatriz: evaluacion.idVersionMatriz },
      include: { nivelRiesgo: true },
      orderBy: { orden: 'asc' },
    });

    // --- 1) % de cumplimiento (se necesita antes, para resolver el factor automático) ---
    const cumplimiento = riskEngine.calcularCumplimiento(respuestas);

    // --- 2) Opción del factor automático (se calcula aparte para poder
    //     persistir su id real en evaluacion_factor_riesgo) ---
    const opcionAuto = riskEngine.resolverOpcionFactorAutomatico(
      cumplimiento.porcentajeCumplimiento,
      opcionesFactorAuto,
    );
    seleccionesConOpcion.push({
      idFactor: factorAutoDb.id,
      idOpcionFactor: BigInt(opcionAuto.id),
      puntaje: opcionAuto.puntaje,
      peso: Number(factorAutoDb.peso ?? 0),
      numero: factorAutoDb.numero ?? 0,
      nombre: factorAutoDb.nombre,
    });

    // --- 3) Cálculo completo delegado al paquete compartido ---
    const resultado = riskEngine.calcularRiesgo({
      respuestas,
      factoresManuales,
      factorAutomatico: {
        numero: factorAutoDb.numero ?? 0,
        nombre: factorAutoDb.nombre,
        peso: Number(factorAutoDb.peso ?? 0),
        opciones: opcionesFactorAuto,
      },
      puntajesRpCategorias,
      rangosCalificacion: rangosCalifDb.map((r) => ({
        limiteInferior: Number(r.limiteInferior),
        limiteSuperior: Number(r.limiteSuperior),
        incluyeInferior: r.incluyeInferior,
        incluyeSuperior: r.incluyeSuperior,
        descripcion: r.descripcion,
        accion: r.accion,
      })),
      rangosFrecuencia: rangosFrecDb.map((r) => ({
        id: Number(r.id),
        limiteInferior: Number(r.limiteInferior),
        limiteSuperior: r.limiteSuperior != null ? Number(r.limiteSuperior) : null,
        incluyeInferior: r.incluyeInferior,
        incluyeSuperior: r.incluyeSuperior,
        nivelRiesgo: r.nivelRiesgo?.codigo ?? '',
        frecuencia: r.frecuencia,
        mesesHastaProxima: r.mesesHastaProxima ?? 0,
      })),
      reglaAprobacion: {
        porcentajeMinimoAprobacion: Number(evaluacion.versionFicha.porcentajeMinimoAprobacion ?? 60),
        maxNcCriticas: evaluacion.versionFicha.maxNcCriticas ?? 1,
        maxNcMayores: evaluacion.versionFicha.maxNcMayores ?? 5,
        porcentajePermisoSanitario: Number(evaluacion.versionFicha.porcentajePermisoSanitario),
      },
    });

    // --- 4) Persistir snapshot único en calculo_riesgo ---
    const nivelRiesgoRow = await this.prisma.nivelRiesgo.findFirst({
      where: { codigo: resultado.nivelRiesgo },
    });

    const datosComunes = {
      porcentajeCumplimiento: resultado.cumplimiento.porcentajeCumplimiento,
      puntosObtenidos: resultado.cumplimiento.puntosObtenidos,
      puntosExcluidosNa: resultado.cumplimiento.puntosExcluidosNa,
      puntajeTotalPosible: resultado.cumplimiento.puntajeTotalPosible,
      denominadorEfectivo: resultado.cumplimiento.denominadorEfectivo,
      itemsRespondidos: resultado.cumplimiento.itemsRespondidos,
      itemsNa: resultado.cumplimiento.itemsNa,
      ncCriticas: resultado.cumplimiento.ncCriticas,
      ncMayores: resultado.cumplimiento.ncMayores,
      ncMenores: resultado.cumplimiento.ncMenores,
      calificacionTexto: resultado.calificacionTexto,
      aprueba: resultado.aprueba,
      otorgaPermisoSanitario: resultado.otorgaPermisoSanitario,
      rpValor: resultado.rpValor,
      reValor: resultado.reValor,
      rtValor: resultado.rtValor,
      idNivelRiesgo: nivelRiesgoRow?.id,
      frecuencia: resultado.frecuencia,
      fechaProximaInspeccion: resultado.fechaProximaInspeccion,
      reDetalle: resultado.reDetalle as any,
    };

    const calculo = await this.prisma.calculoRiesgo.upsert({
      where: { idEvaluacion: evaluacion.id },
      create: { idEvaluacion: evaluacion.id, ...datosComunes },
      update: datosComunes,
    });

    // --- 5) Persistir el detalle de factores aplicados (trazabilidad) ---
    await this.prisma.evaluacionFactorRiesgo.deleteMany({ where: { idEvaluacion: evaluacion.id } });
    await this.prisma.evaluacionFactorRiesgo.createMany({
      data: seleccionesConOpcion.map((s) => ({
        idEvaluacion: evaluacion.id,
        idFactor: s.idFactor,
        idOpcionFactor: s.idOpcionFactor,
        puntajeAplicado: s.puntaje,
        pesoAplicado: s.peso,
        aporte: s.puntaje * s.peso,
      })),
    });

    return { ...calculo, id: calculo.id.toString(), idEvaluacion: calculo.idEvaluacion.toString() };
  }
}
