import { Test } from '@nestjs/testing';
import { MotorRiesgoService } from '../src/modules/motor-riesgo/motor-riesgo.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MotorRiesgoService - Casos Borde y Reglas de Negocio', () => {
  let service: MotorRiesgoService;
  let prismaMock: any;

  const EVALUACION_ID = 100n;
  const ESTABLECIMIENTO_ID = 50n;
  const VERSION_MATRIZ_ID = 1n;
  const VERSION_FICHA_ID = 1n;

  const FACTOR_AUTO = {
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

  const FACTORES_MANUALES = [
    { id: 2n, numero: 1, nombre: 'Factor 1', peso: 0.09, esAutomatico: false, opciones: [{ id: 20n, puntaje: 1 }] },
    { id: 3n, numero: 2, nombre: 'Factor 2', peso: 0.08, esAutomatico: false, opciones: [{ id: 30n, puntaje: 1 }] },
    { id: 4n, numero: 4, nombre: 'Factor 4', peso: 0.05, esAutomatico: false, opciones: [{ id: 40n, puntaje: 1 }] },
    { id: 5n, numero: 5, nombre: 'Factor 5', peso: 0.06, esAutomatico: false, opciones: [{ id: 50n, puntaje: 1 }] },
    { id: 6n, numero: 6, nombre: 'Factor 6', peso: 0.16, esAutomatico: false, opciones: [{ id: 60n, puntaje: 1 }] },
  ];

  const SELECCIONES_MANUALES = FACTORES_MANUALES.map((f) => ({
    factorId: f.id.toString(),
    opcionId: f.opciones[0].id.toString(),
  }));

  beforeEach(async () => {
    prismaMock = {
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
      factorRiesgoEstablecimiento: { findMany: jest.fn().mockResolvedValue([FACTOR_AUTO, ...FACTORES_MANUALES]) },
      rangoCalificacion: {
        findMany: jest.fn().mockResolvedValue([
          { limiteInferior: 0, limiteSuperior: 60, incluyeInferior: true, incluyeSuperior: false, descripcion: 'Inaceptable', accion: 'Cierre' },
          { limiteInferior: 60, limiteSuperior: 80, incluyeInferior: true, incluyeSuperior: false, descripcion: 'Regular', accion: 'Corregir' },
          { limiteInferior: 80, limiteSuperior: 100, incluyeInferior: true, incluyeSuperior: true, descripcion: 'Bueno', accion: 'Conforme' },
        ]),
      },
      rangoFrecuencia: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1n, limiteInferior: 1.0, limiteSuperior: 3.6, incluyeInferior: true, incluyeSuperior: true, nivelRiesgo: { codigo: 'BAJO' }, frecuencia: 'ANUAL', mesesHastaProxima: 12 },
          { id: 2n, limiteInferior: 3.6, limiteSuperior: 6.3, incluyeInferior: false, incluyeSuperior: true, nivelRiesgo: { codigo: 'MEDIO' }, frecuencia: 'SEMESTRAL', mesesHastaProxima: 6 },
          { id: 3n, limiteInferior: 6.3, limiteSuperior: 9.0, incluyeInferior: false, incluyeSuperior: true, nivelRiesgo: { codigo: 'ALTO' }, frecuencia: 'TRIMESTRAL', mesesHastaProxima: 3 },
        ]),
      },
      nivelRiesgo: {
        findFirst: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve({ id: where.codigo === 'BAJO' ? 1 : 2, codigo: where.codigo }),
        ),
      },
      calculoRiesgo: {
        upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 1n, ...create })),
      },
      evaluacionFactorRiesgo: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [MotorRiesgoService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(MotorRiesgoService);
  });

  it('excluye estrictamente las respuestas N/A del denominador de cálculo', async () => {
    // 1 ítem Cumple (1 punto) y 1 ítem N/A (excluido)
    // Denominador efectivo debe ser 1 (no 2), por lo tanto cumplimiento = 100%
    prismaMock.respuestaItem.findMany.mockResolvedValue([
      {
        idItemFicha: 1n,
        pesoAplicado: 1,
        opcionRespuesta: { id: 1n, codigo: 'C', valor: 1, excluyeDelCalculo: false, generaNc: false },
        criticidad: null,
      },
      {
        idItemFicha: 2n,
        pesoAplicado: 1,
        opcionRespuesta: { id: 2n, codigo: 'NA', valor: 0, excluyeDelCalculo: true, generaNc: false },
        criticidad: null,
      },
    ]);
    prismaMock.establecimientoCategoria.findMany.mockResolvedValue([
      { subcategoria: { nivelResultante: { puntajeRp: 1 } } },
    ]);

    const resultado = await service.calcularRiesgoEstablecimiento({
      evaluacionId: EVALUACION_ID.toString(),
      seleccionesFactores: SELECCIONES_MANUALES,
    });

    expect(Number(resultado.porcentajeCumplimiento)).toBe(100);
    expect(Number(resultado.denominadorEfectivo)).toBe(1);
    expect(resultado.itemsNa).toBe(1);
    expect(resultado.itemsRespondidos).toBe(2);
    expect(resultado.otorgaPermisoSanitario).toBe(true); // >= 81%
  });

  it('no aprueba si se supera el número máximo de No Conformidades Críticas (> 1)', async () => {
    // 2 ítems con incumplimiento total crítico
    prismaMock.respuestaItem.findMany.mockResolvedValue([
      {
        idItemFicha: 1n,
        pesoAplicado: 1,
        opcionRespuesta: { id: 10n, codigo: 'IT', valor: 0, excluyeDelCalculo: false, generaNc: true },
        criticidad: { codigo: 'C' },
      },
      {
        idItemFicha: 2n,
        pesoAplicado: 1,
        opcionRespuesta: { id: 10n, codigo: 'IT', valor: 0, excluyeDelCalculo: false, generaNc: true },
        criticidad: { codigo: 'C' },
      },
      {
        idItemFicha: 3n,
        pesoAplicado: 1,
        opcionRespuesta: { id: 1n, codigo: 'C', valor: 1, excluyeDelCalculo: false, generaNc: false },
        criticidad: null,
      },
    ]);
    prismaMock.establecimientoCategoria.findMany.mockResolvedValue([
      { subcategoria: { nivelResultante: { puntajeRp: 1 } } },
    ]);

    const resultado = await service.calcularRiesgoEstablecimiento({
      evaluacionId: EVALUACION_ID.toString(),
      seleccionesFactores: SELECCIONES_MANUALES,
    });

    expect(resultado.ncCriticas).toBe(2);
    expect(resultado.aprueba).toBe(false);
  });
});
