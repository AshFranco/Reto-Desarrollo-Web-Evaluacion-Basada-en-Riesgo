import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MotorRiesgoService } from '../src/modules/motor-riesgo/motor-riesgo.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Verifica que las fórmulas del Motor de Riesgo (esquema oficial, 51 tablas)
 * coinciden con la "Hoja de Cálculo de Categorización de Establecimiento y
 * Frecuencia de Inspección". Cubre además el Factor 3 "Cumplimiento BPM"
 * automático (derivado del % de la ficha), que es el hallazgo documentado
 * en COMPARACION_ARQUITECTURA.md sección 3.
 */
describe('MotorRiesgoService', () => {
  let service: MotorRiesgoService;
  let prisma: any;

  const EVALUACION_ID = 1n;
  const ESTABLECIMIENTO_ID = 10n;
  const VERSION_MATRIZ_ID = 100n;
  const VERSION_FICHA_ID = 200n;

  // 5 factores manuales en su MEJOR opción (puntaje 1), más el factor
  // automático "Cumplimiento BPM" cuyo puntaje depende del % de la ficha.
  const FACTORES_MANUALES = [
    { id: 2n, numero: 1, nombre: 'Factor 1', peso: 0.09, esAutomatico: false, opciones: [{ id: 20n, puntaje: 1, limiteInf: null, limiteSup: null }] },
    { id: 3n, numero: 2, nombre: 'Factor 2', peso: 0.08, esAutomatico: false, opciones: [{ id: 30n, puntaje: 1, limiteInf: null, limiteSup: null }] },
    { id: 4n, numero: 4, nombre: 'Factor 4', peso: 0.05, esAutomatico: false, opciones: [{ id: 40n, puntaje: 1, limiteInf: null, limiteSup: null }] },
    { id: 5n, numero: 5, nombre: 'Factor 5', peso: 0.06, esAutomatico: false, opciones: [{ id: 50n, puntaje: 1, limiteInf: null, limiteSup: null }] },
    { id: 6n, numero: 6, nombre: 'Factor 6', peso: 0.16, esAutomatico: false, opciones: [{ id: 60n, puntaje: 1, limiteInf: null, limiteSup: null }] },
  ];
  const FACTOR_AUTOMATICO = {
    id: 1n,
    numero: 3,
    nombre: 'Factor 3 Cumplimiento',
    peso: 0.56,
    esAutomatico: true,
    opciones: [
      { id: 11n, descripcion: '<=60%', puntaje: 3, limiteInf: 0, limiteSup: 60 },
      { id: 12n, descripcion: '60-70%', puntaje: 2.33, limiteInf: 60, limiteSup: 70 },
      { id: 13n, descripcion: '70-80%', puntaje: 1.67, limiteInf: 70, limiteSup: 80 },
      { id: 14n, descripcion: '>80%', puntaje: 1, limiteInf: 80, limiteSup: 100 },
    ],
  };
  const TODOS_LOS_FACTORES = [FACTOR_AUTOMATICO, ...FACTORES_MANUALES];
  const SELECCIONES_MANUALES = FACTORES_MANUALES.map((f) => ({
    factorId: f.id.toString(),
    opcionId: f.opciones[0].id.toString(),
  }));

  function mockRespuestasParaPorcentaje(porcentaje: number) {
    prisma.respuestaItem.findMany.mockResolvedValue([
      {
        idItemFicha: 1n,
        pesoAplicado: 1,
        opcionRespuesta: {
          id: 101n,
          codigo: 'C',
          valor: porcentaje / 100,
          excluyeDelCalculo: false,
          generaNc: false,
        },
        criticidad: null,
      },
    ]);
  }

  beforeEach(async () => {
    prisma = {
      evaluacion: {
        findUnique: jest.fn().mockResolvedValue({
          id: EVALUACION_ID,
          idEstablecimiento: ESTABLECIMIENTO_ID,
          idVersionMatriz: VERSION_MATRIZ_ID,
          idVersionFicha: VERSION_FICHA_ID,
          establecimiento: { id: ESTABLECIMIENTO_ID },
          versionFicha: {
            id: VERSION_FICHA_ID,
            porcentajeMinimoAprobacion: 60,
            maxNcCriticas: 1,
            maxNcMayores: 5,
            porcentajePermisoSanitario: 81,
          },
        }),
      },
      respuestaItem: { findMany: jest.fn() },
      establecimientoCategoria: { findMany: jest.fn() },
      factorRiesgoEstablecimiento: { findMany: jest.fn().mockResolvedValue(TODOS_LOS_FACTORES) },
      rangoCalificacion: {
        findMany: jest.fn().mockResolvedValue([
          { limiteInferior: 0, limiteSuperior: 60, incluyeInferior: true, incluyeSuperior: false, descripcion: 'Insatisfactorio', accion: 'No Aprueba' },
          { limiteInferior: 60, limiteSuperior: 100, incluyeInferior: true, incluyeSuperior: true, descripcion: 'Aceptable', accion: 'Aprueba' },
        ]),
      },
      rangoFrecuencia: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1n, limiteInferior: 1, limiteSuperior: 3.6, incluyeInferior: true, incluyeSuperior: true, nivelRiesgo: { codigo: 'BAJO' }, frecuencia: 'ANUAL', mesesHastaProxima: 12 },
          { id: 2n, limiteInferior: 3.6, limiteSuperior: 6.3, incluyeInferior: false, incluyeSuperior: true, nivelRiesgo: { codigo: 'MEDIO' }, frecuencia: 'SEMESTRAL', mesesHastaProxima: 6 },
          { id: 3n, limiteInferior: 6.3, limiteSuperior: 9, incluyeInferior: false, incluyeSuperior: true, nivelRiesgo: { codigo: 'ALTO' }, frecuencia: 'TRIMESTRAL', mesesHastaProxima: 3 },
        ]),
      },
      nivelRiesgo: {
        findFirst: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve({
            id: where.codigo === 'BAJO' ? 1n : where.codigo === 'MEDIO' ? 2n : 3n,
            codigo: where.codigo,
          }),
        ),
      },
      calculoRiesgo: {
        upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 999n, ...create })),
      },
      evaluacionFactorRiesgo: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [MotorRiesgoService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(MotorRiesgoService);
  });

  it('RE = 1 y RT = 1 (Riesgo Bajo/Anual) cuando todos los factores están en su mejor opción', async () => {
    // % de cumplimiento = 85 -> cae en el rango >80% del factor automático -> puntaje 1
    mockRespuestasParaPorcentaje(85);
    prisma.establecimientoCategoria.findMany.mockResolvedValue([
      { subcategoria: { nivelResultante: { puntajeRp: 1 } } }, // Bajo
    ]);

    const resultado = await service.calcularRiesgoEstablecimiento({
      evaluacionId: EVALUACION_ID.toString(),
      seleccionesFactores: SELECCIONES_MANUALES,
    });

    // RE = Σ(1 × peso_i) = Σpesos = 1.00 (0.56+0.09+0.08+0.05+0.06+0.16)
    expect(Number(resultado.reValor)).toBeCloseTo(1.0, 4);
    expect(Number(resultado.rpValor)).toBe(1);
    expect(Number(resultado.rtValor)).toBeCloseTo(1.0, 4);
    expect(Number(resultado.idNivelRiesgo)).toBe(1);
    expect(resultado.frecuencia).toBe('ANUAL');
  });

  it('el Factor 3 automático usa el peor puntaje (3) cuando el % de cumplimiento es bajo (<=60%)', async () => {
    mockRespuestasParaPorcentaje(50); // <=60% -> peor opción del factor automático (puntaje 3)
    prisma.establecimientoCategoria.findMany.mockResolvedValue([
      { subcategoria: { nivelResultante: { puntajeRp: 3 } } }, // Alto
    ]);

    const resultado = await service.calcularRiesgoEstablecimiento({
      evaluacionId: EVALUACION_ID.toString(),
      seleccionesFactores: SELECCIONES_MANUALES, // los 5 manuales siguen en su mejor opción (puntaje 1)
    });

    // RE = (3 × 0.56) + (1 × 0.44 restante) = 1.68 + 0.44 = 2.12
    expect(Number(resultado.reValor)).toBeCloseTo(2.12, 2);
    expect(Number(resultado.rpValor)).toBe(3);
    // RT = 3 × 2.12 = 6.36 -> cae en el rango >6.3 -> Alto/Trimestral
    expect(Number(resultado.rtValor)).toBeGreaterThan(6.3);
    expect(resultado.frecuencia).toBe('TRIMESTRAL');
  });

  it('rechaza el cálculo si el establecimiento no tiene categorías de alimento asignadas', async () => {
    mockRespuestasParaPorcentaje(85);
    prisma.establecimientoCategoria.findMany.mockResolvedValue([]);

    await expect(
      service.calcularRiesgoEstablecimiento({
        evaluacionId: EVALUACION_ID.toString(),
        seleccionesFactores: SELECCIONES_MANUALES,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('usa el MAYOR puntaje_rp entre varias categorías de alimento elaboradas (RP)', async () => {
    mockRespuestasParaPorcentaje(85);
    prisma.establecimientoCategoria.findMany.mockResolvedValue([
      { subcategoria: { nivelResultante: { puntajeRp: 1 } } },
      { subcategoria: { nivelResultante: { puntajeRp: 3 } } }, // debe dominar
      { subcategoria: { nivelResultante: { puntajeRp: 2 } } },
    ]);

    const resultado = await service.calcularRiesgoEstablecimiento({
      evaluacionId: EVALUACION_ID.toString(),
      seleccionesFactores: SELECCIONES_MANUALES,
    });

    expect(Number(resultado.rpValor)).toBe(3);
  });
});
