import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

function leerJson<T>(nombre: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, 'seed-data', nombre), 'utf-8'),
  ) as T;
}

// ---------------------------------------------------------------------
// 1) ROLES
// ---------------------------------------------------------------------
async function seedRoles() {
  const roles = [
    { codigo: 'ADMINISTRADOR', nombre: 'Administrador', esInterno: true },
    { codigo: 'ADMINISTRADOR_EMPRESA', nombre: 'Administrador de Empresa', esInterno: false },
    { codigo: 'USUARIO_DELEGADO', nombre: 'Usuario Delegado', esInterno: false },
    { codigo: 'COORDINADOR', nombre: 'Coordinador', esInterno: true },
    { codigo: 'TECNICO_EVALUADOR', nombre: 'Técnico Evaluador', esInterno: true },
  ];
  for (const r of roles) {
    await prisma.rol.upsert({ where: { codigo: r.codigo }, create: r, update: r });
  }
  console.log(`✔ Roles: ${roles.length}`);
}

// ---------------------------------------------------------------------
// 2) CATÁLOGOS DE RIESGO: nivel_riesgo, nivel_criticidad, estado_evaluacion, origen_caso
// ---------------------------------------------------------------------
async function seedCatalogosBase() {
  const niveles = [
    { codigo: 'BAJO', nombre: 'Riesgo Bajo', puntajeMatriz: 2, puntajeRp: 1, orden: 1, colorHex: '#22C55E' },
    { codigo: 'MEDIO', nombre: 'Riesgo Medio', puntajeMatriz: 4, puntajeRp: 2, orden: 2, colorHex: '#F59E0B' },
    { codigo: 'ALTO', nombre: 'Riesgo Alto', puntajeMatriz: 8, puntajeRp: 3, orden: 3, colorHex: '#EF4444' },
  ];
  for (const n of niveles) {
    await prisma.nivelRiesgo.upsert({ where: { codigo: n.codigo }, create: n, update: n });
  }

  const criticidades = [
    { codigo: 'C', nombre: 'Crítica', orden: 1 },
    { codigo: 'M', nombre: 'Mayor', orden: 2 },
    { codigo: 'Me', nombre: 'Menor', orden: 3 },
  ];
  for (const c of criticidades) {
    await prisma.nivelCriticidad.upsert({ where: { codigo: c.codigo }, create: c, update: c });
  }

  const estados = [
    { codigo: 'PROGRAMADA', nombre: 'Programada', esFinal: false, bloqueaDatos: false, orden: 1 },
    { codigo: 'EN_CURSO', nombre: 'En Curso', esFinal: false, bloqueaDatos: false, orden: 2 },
    { codigo: 'FINALIZADA', nombre: 'Finalizada', esFinal: false, bloqueaDatos: true, orden: 3 },
    { codigo: 'EN_REVISION', nombre: 'En Revisión', esFinal: false, bloqueaDatos: true, orden: 4 },
    { codigo: 'APROBADA', nombre: 'Aprobada', esFinal: false, bloqueaDatos: true, orden: 5 },
    { codigo: 'DEVUELTA', nombre: 'Devuelta', esFinal: false, bloqueaDatos: false, orden: 6 },
    { codigo: 'CERRADA', nombre: 'Cerrada', esFinal: true, bloqueaDatos: true, orden: 7 },
  ];
  for (const e of estados) {
    await prisma.estadoEvaluacion.upsert({ where: { codigo: e.codigo }, create: e, update: e });
  }

  const origenes = [
    { codigo: 'SOLICITUD', nombre: 'Solicitud de Empresa', orden: 1 },
    { codigo: 'PROGRAMACION', nombre: 'Programación Institucional', orden: 2 },
    { codigo: 'ALERTA', nombre: 'Alerta LAPCH', orden: 3 },
    { codigo: 'DENUNCIA', nombre: 'Denuncia', orden: 4 },
  ];
  for (const o of origenes) {
    await prisma.origenCaso.upsert({ where: { codigo: o.codigo }, create: o, update: o });
  }

  console.log(`✔ Catálogos base: ${niveles.length} niveles de riesgo, ${criticidades.length} criticidades, ${estados.length} estados de evaluación, ${origenes.length} orígenes de caso`);
}

// ---------------------------------------------------------------------
// 3) VERSIÓN DE LA MATRIZ DE RIESGO: rango_frecuencia + rango_nivel_riesgo + factores
// ---------------------------------------------------------------------
async function seedMatrizRiesgo() {
  const existente = await prisma.versionMatrizRiesgo.findFirst({
    where: { numeroVersion: 'v1-2026' },
  });
  if (existente) {
    console.log('✔ Matriz de riesgo v1-2026 ya sembrada, se omite.');
    return existente.id;
  }

  const versionMatriz = await prisma.versionMatrizRiesgo.create({
    data: { numeroVersion: 'v1-2026', estado: 'Activa' },
  });

  const niveles = await prisma.nivelRiesgo.findMany();
  const nivelPorCodigo = new Map(niveles.map((n) => [n.codigo, n]));

  // Matriz de Frecuencia de Inspección (fuente: Hoja Frecuencia Inspección)
  const rangos = leerJson<
    { limiteInferior: number; limiteInferiorIncluye: boolean; limiteSuperior: number | null; nivelRiesgo: string; frecuencia: string }[]
  >('rangos-riesgo.json');
  const mesesPorFrecuencia: Record<string, number> = { ANUAL: 12, SEMESTRAL: 6, TRIMESTRAL: 3 };

  for (let i = 0; i < rangos.length; i++) {
    const r = rangos[i];
    await prisma.rangoFrecuencia.create({
      data: {
        idVersionMatriz: versionMatriz.id,
        idNivelRiesgo: nivelPorCodigo.get(r.nivelRiesgo)!.id,
        limiteInferior: r.limiteInferior,
        limiteSuperior: r.limiteSuperior,
        incluyeInferior: r.limiteInferiorIncluye,
        incluyeSuperior: true,
        frecuencia: r.frecuencia,
        mesesHastaProxima: mesesPorFrecuencia[r.frecuencia],
        orden: i,
      },
    });
  }

  // Rango de conversión de escala 2-8 (matriz de alimentos) -> Bajo/Medio/Alto.
  // AMBIGÜEDAD A-01: no confirmado por DIGEMAPS, marcado es_supuesto=true.
  const rangosNivel = [
    { codigo: 'BAJO', inf: 0, sup: 3 },
    { codigo: 'MEDIO', inf: 3, sup: 6 },
    { codigo: 'ALTO', inf: 6, sup: 8 },
  ];
  for (const rn of rangosNivel) {
    await prisma.rangoNivelRiesgo.create({
      data: {
        idVersionMatriz: versionMatriz.id,
        idNivelRiesgo: nivelPorCodigo.get(rn.codigo)!.id,
        limiteInferior: rn.inf,
        limiteSuperior: rn.sup,
        esSupuesto: true,
      },
    });
  }

  // 6 factores de riesgo del establecimiento (uno automático: Cumplimiento BPM)
  const factores = leerJson<
    {
      codigo: string;
      nombre: string;
      peso: number;
      esAutomatico: boolean;
      opciones: { etiqueta: string; puntaje: number; limiteInf: number | null; limiteSup: number | null }[];
    }[]
  >('factores-riesgo.json');

  let numero = 1;
  for (const f of factores) {
    const factor = await prisma.factorRiesgoEstablecimiento.create({
      data: {
        idVersionMatriz: versionMatriz.id,
        numero: numero++,
        nombre: f.nombre,
        peso: f.peso,
        esAutomatico: f.esAutomatico,
      },
    });
    let orden = 0;
    for (const op of f.opciones) {
      await prisma.opcionFactor.create({
        data: {
          idFactor: factor.id,
          descripcion: op.etiqueta,
          puntaje: op.puntaje,
          limiteInf: op.limiteInf,
          limiteSup: op.limiteSup,
          orden: orden++,
        },
      });
    }
  }

  console.log(
    `✔ Matriz de riesgo: ${rangos.length} rangos de frecuencia, ${rangosNivel.length} rangos de nivel, ${factores.length} factores (uno automático: Cumplimiento BPM)`,
  );
  return versionMatriz.id;
}

// ---------------------------------------------------------------------
// 4) CATEGORÍAS DE ALIMENTO (Matriz de Riesgo de Alimentos)
// ---------------------------------------------------------------------
async function seedCategoriasAlimento() {
  const existente = await prisma.categoriaAlimento.findFirst();
  if (existente) {
    console.log('✔ Categorías de alimento ya sembradas, se omite.');
    return;
  }

  const categorias = leerJson<
    {
      categoria: string;
      subcategoria: string;
      riesgoMicrobiologico: string | null;
      puntajeMicrobiologico: number | null;
      riesgoQuimico: string | null;
      puntajeQuimico: number | null;
      puntajeRiesgoTotal: number;
      nivelRiesgoProducto: string;
    }[]
  >('categorias-alimento.json');

  const niveles = await prisma.nivelRiesgo.findMany();
  const nivelPorCodigo = new Map(niveles.map((n) => [n.codigo, n]));

  const categoriaIdPorNombre = new Map<string, bigint>();

  const truncar150 = (s: string) => (s.length > 150 ? s.slice(0, 147) + '...' : s);

  for (const c of categorias) {
    const nombreCategoria = truncar150(c.categoria);
    let idCategoria = categoriaIdPorNombre.get(nombreCategoria);
    if (!idCategoria) {
      const categoriaCreada = await prisma.categoriaAlimento.create({
        data: { nombre: nombreCategoria },
      });
      idCategoria = categoriaCreada.id;
      categoriaIdPorNombre.set(nombreCategoria, idCategoria);
    }

    await prisma.subcategoriaAlimento.create({
      data: {
        idCategoria,
        nombre: truncar150(c.subcategoria),
        idNivelRiesgoMicrobiologico: c.riesgoMicrobiologico
          ? nivelPorCodigo.get(c.riesgoMicrobiologico)?.id
          : undefined,
        idNivelRiesgoQuimico: c.riesgoQuimico ? nivelPorCodigo.get(c.riesgoQuimico)?.id : undefined,
        riesgoTotalCalculado: c.puntajeRiesgoTotal,
        idNivelRiesgoResultante: nivelPorCodigo.get(c.nivelRiesgoProducto)?.id,
      },
    });
  }

  console.log(
    `✔ Catálogo de alimentos: ${categoriaIdPorNombre.size} categorías, ${categorias.length} subcategorías`,
  );
}

// ---------------------------------------------------------------------
// 5) FICHA BPM (versionada, con jerarquía sección -> ítem)
// ---------------------------------------------------------------------
async function seedFichaBpm() {
  const existente = await prisma.versionFicha.findFirst({
    where: { numeroVersion: '2024-10-Rev-FSP-FD' },
  });
  if (existente) {
    console.log('✔ Ficha BPM ya sembrada, se omite (las versiones publicadas son inmutables).');
    return;
  }

  const ficha = leerJson<{
    codigo: string;
    version: string;
    totalPuntosPosibles: number;
    umbralAprobacionPorcentaje: number;
    maxNcCriticasFallidas: number;
    maxNcMayoresFallidas: number;
    secciones: { codigo: string; titulo: string; orden: number; items: { descripcion: string; orden: number }[] }[];
  }>('ficha-bpm.json');

  const totalItems = ficha.secciones.reduce((acc, s) => acc + s.items.length, 0);

  const versionFicha = await prisma.versionFicha.create({
    data: {
      numeroVersion: ficha.version,
      nombre: 'Ficha de Inspección BPM - Revisión Final',
      estado: 'Activa',
      fechaVigenciaDesde: new Date(),
      totalItemsEvaluables: totalItems,
      puntajeTotalPosible: ficha.totalPuntosPosibles,
      porcentajeMinimoAprobacion: ficha.umbralAprobacionPorcentaje,
      maxNcCriticas: ficha.maxNcCriticasFallidas,
      maxNcMayores: ficha.maxNcMayoresFallidas,
    },
  });

  // Opciones de respuesta (C/CP/IT/N-A), específicas de esta versión de ficha.
  const opciones = [
    { codigo: 'C', valor: 1, excluyeDelCalculo: false, generaNc: false },
    { codigo: 'CP', valor: 0.5, excluyeDelCalculo: false, generaNc: true },
    { codigo: 'IT', valor: 0, excluyeDelCalculo: false, generaNc: true },
    { codigo: 'N/A', valor: 0, excluyeDelCalculo: true, generaNc: false },
  ];
  for (const op of opciones) {
    await prisma.opcionRespuesta.create({
      data: { idVersionFicha: versionFicha.id, ...op },
    });
  }

  // Jerarquía: cada sección es un item_ficha padre (no evaluable), y sus
  // ítems reales son hijos (evaluables) -- soporta la estructura auto-referenciada.
  for (const seccion of ficha.secciones) {
    const nodoSeccion = await prisma.itemFicha.create({
      data: {
        idVersionFicha: versionFicha.id,
        numeracion: seccion.codigo,
        titulo: seccion.titulo,
        esEvaluable: false,
        orden: seccion.orden,
        nivel: 1,
      },
    });

    for (const item of seccion.items) {
      await prisma.itemFicha.create({
        data: {
          idVersionFicha: versionFicha.id,
          idPadre: nodoSeccion.id,
          numeracion: `${seccion.codigo}.${item.orden}`,
          titulo: item.descripcion,
          esEvaluable: true,
          orden: item.orden,
          nivel: 2,
          peso: 1.0,
        },
      });
    }
  }

  console.log(
    `✔ Ficha BPM "${ficha.version}": ${ficha.secciones.length} secciones, ${totalItems} ítems evaluables (total puntos posibles: ${ficha.totalPuntosPosibles}).`,
  );
}

// ---------------------------------------------------------------------
// 6) USUARIO ADMINISTRADOR INICIAL
// ---------------------------------------------------------------------
async function seedAdministrador() {
  const correo = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!correo || !password) {
    console.log(
      '⚠ SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD no definidos: se omite la creación del administrador inicial.',
    );
    return;
  }

  const rolAdmin = await prisma.rol.findUniqueOrThrow({ where: { codigo: 'ADMINISTRADOR' } });
  const contrasenaHash = await argon2.hash(password, { type: argon2.argon2id });

  const usuarioExistente = await prisma.usuario.findUnique({ where: { correoElectronico: correo } });
  if (usuarioExistente) {
    console.log(`✔ Usuario administrador ya existía: ${correo}`);
    return;
  }

  await prisma.usuario.create({
    data: {
      nombreCompleto: 'Administrador del Sistema',
      cedulaPasaporte: 'ADMIN-INICIAL',
      correoElectronico: correo,
      contrasenaHash,
      estado: 'APROBADO',
      roles: { create: { idRol: rolAdmin.id } },
    },
  });
  console.log(`✔ Usuario administrador inicial creado: ${correo}`);
}

async function main() {
  await seedRoles();
  await seedCatalogosBase();
  await seedMatrizRiesgo();
  await seedCategoriasAlimento();
  await seedFichaBpm();
  await seedAdministrador();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
