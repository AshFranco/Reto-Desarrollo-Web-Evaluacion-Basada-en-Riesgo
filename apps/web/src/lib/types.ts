export interface UsuarioLocal {
  id: string;
  nombreCompleto: string;
  rol: string;
  empresaId: string | null;
}

export interface LoginResponse {
  requiereMfa?: false;
  accessToken: string;
  usuario: UsuarioLocal;
}

export interface LoginMfaRequerido {
  requiereMfa: true;
  mensaje: string;
  codigoDemo?: string;
}

export type LoginResult = LoginResponse | LoginMfaRequerido;

/**
 * Forma de GET /api/v1/usuarios/perfil — devuelve los datos
 * completos del usuario autenticado para la pantalla de Mi Perfil.
 */
export interface PerfilUsuario {
  id: string;
  nombreCompleto: string;
  correoElectronico: string;
  telefono: string | null;
  roles: string[];
  idEmpresa: string | null;
  dobleFactorActivo: boolean;
}

/**
 * peso: corregido a `string | null` — probado en vivo que es un Decimal de
 * Prisma (mismo patrón que Establecimiento.produccionAnual) y llega como
 * string (ej. `"peso":"1"`), null en los nodos no evaluables (secciones).
 */
export interface NodoCatalogo {
  id: string;
  idPadre: string | null;
  numeracion: string;
  titulo: string;
  nivel: number;
  orden: number;
  esEvaluable: boolean;
  peso: string | null;
  idCriticidad: string | null;
  hijos: NodoCatalogo[];
}

/**
 * Confirmado en vivo contra opcion_respuesta (schema.prisma) y la respuesta
 * real de GET /formularios/vigente: el modelo NO tiene columna `nombre`
 * (se había inventado en una fase anterior sin verificar) y `valor` es un
 * Decimal que llega como string (ej. `"valor":"0.5"`), no number.
 */
export interface OpcionRespuestaLocal {
  id: string;
  codigo: string;
  valor: string;
  excluyeDelCalculo: boolean;
  generaNc: boolean;
}

export interface FormularioVigenteResponse {
  id: string;
  secciones: NodoCatalogo[];
  opcionesRespuesta: OpcionRespuestaLocal[];
}

/**
 * Forma confirmada contra establecimientos.service.ts (serializar()) y
 * probada en vivo contra el backend real. `empresa` solo viene incluida en
 * GET /establecimientos/:id, no en el listado.
 *
 * produccionAnual/latitud/longitud son `Decimal` en Prisma — confirmado en
 * vivo que el backend los devuelve como STRING en el JSON (ej.
 * `"produccionAnual":"50000"`, no `50000`), aunque el DTO de entrada los
 * pida como number. Si mandás un número al crear/editar, para volver a
 * leerlo hay que parsearlo — ver FormularioEstablecimiento.tsx.
 */
export interface Establecimiento {
  id: string;
  idEmpresa: string;
  idMunicipio: string | null;
  idDpsDas: number | null;
  nombre: string;
  rnc: string | null;
  calle: string | null;
  telefono: string | null;
  correo: string | null;
  fechaInicioOperaciones: string | null;
  numeroPermisoSanitario: string | null;
  fechaVencimientoPermiso: string | null;
  produccionAnual: string | null;
  empleadosMasculino: number;
  empleadosFemenino: number;
  mercadoObjetivo: string | null;
  latitud: string | null;
  longitud: string | null;
  activo: boolean;
  empresa?: Empresa;
}

export interface Empresa {
  id: string;
  razonSocial: string;
  rnc: string;
  nombreComercial: string | null;
  direccion: string | null;
  idMunicipio: string | null;
  telefono: string | null;
  correo: string | null;
  actividadEconomica: string | null;
  fechaRegistro: string;
  // Solo viene incluido en GET /empresas/:id, no en el listado.
  establecimientos?: Establecimiento[];
}

export interface SolicitudBpm {
  id: string;
  idEmpresa: string;
  idUsuario: string;
  tipoEstablecimiento: string;
  motivo: string;
  observaciones: string | null;
  estado: string;
  fechaCreacion: string;
  fechaEnvio: string | null;
}

/** id: corregido a number — es un Int en el esquema (catálogo chico), no un BigInt; confirmado en vivo (`"id":1`, sin comillas). */
export interface OrigenCaso {
  id: number;
  codigo: string;
  nombre: string;
  orden: number;
}

export interface AsignacionEvaluador {
  id: string;
  idCaso: string;
  idEvaluador: string;
  idCoordinador: string;
  fechaAsignacion: string;
  estado: string;
  evaluador?: { nombreCompleto: string };
}

/**
 * Forma real de GET /api/v1/asignaciones/mias (asignaciones.service.ts,
 * listarPorEvaluador). Gabriela agregó `evaluacionId` (confirmado en vivo:
 * coincide con el id que devuelve POST /asignaciones al crear la
 * asignación) — antes no existía y era el motivo por el que el botón
 * "Iniciar" del panel del Técnico estaba deshabilitado.
 */
export interface AsignacionMia {
  id: string;
  idCaso: string;
  idEvaluador: string;
  idCoordinador: string;
  fechaAsignacion: string;
  estado: string;
  evaluacionId: string | null;
  evaluacionEstado?: string | null;
  caso: {
    id: string;
    idEstablecimiento: string;
    estado: string;
    prioridad: string | null;
    fechaCreacion: string;
    establecimiento: { nombre: string; calle: string | null };
  };
}

/** Forma que devuelve GET /api/v1/casos — sin datos de empresa, solo establecimiento. */
export interface CasoResumen {
  id: string;
  idEstablecimiento: string;
  idOrigen: number | null;
  estado: string;
  prioridad: string | null;
  fechaCreacion: string;
  establecimiento: { nombre: string; idEmpresa: string };
  origen: OrigenCaso | null;
  asignaciones: AsignacionEvaluador[];
}

/**
 * Forma que devuelve GET /api/v1/casos/:id — sí incluye la empresa.
 *
 * evaluaciones[].idEstado: corregido a number — probado en vivo que el
 * backend lo devuelve como número (FK cruda a estado_evaluacion.id, ej.
 * `"idEstado":4`), no como string. GET /casos/:id no resuelve ese id a su
 * código (a diferencia de GET /evaluaciones/mias, que sí incluye el
 * objeto `estado` completo pero es exclusivo del Técnico Evaluador dueño
 * de la evaluación) — ver ID_ESTADO_EVALUACION en useCasos.ts.
 */
export interface CasoDetalle {
  id: string;
  idEstablecimiento: string;
  estado: string;
  prioridad: string | null;
  fechaCreacion: string;
  fechaCierre: string | null;
  origen?: OrigenCaso | null;
  establecimiento: {
    id: string;
    nombre: string;
    calle?: string | null;
    empresa: Empresa;
  };
  asignaciones?: AsignacionEvaluador[];
  solicitud: SolicitudBpm | null;
  alerta: { id: string; numeroAlerta: string; descripcion: string } | null;
  denuncia: { id: string; tipoDenuncia: string; descripcion: string } | null;
  programacion: { id: string; fechaProgramada: string; frecuenciaAplicada: string } | null;
  evaluaciones: {
    id: string;
    idEstado: number | null;
    fechaProgramada: string | null;
    estado?: { id: number; codigo: string; nombre: string };
  }[];
  expediente: {
    id: string;
    estado: string;
    resultadoFinal?: string | null;
    fechaCierre?: string | null;
  } | null;
}

/**
 * Forma real de GET /api/v1/expedientes (expedientes.service.ts, buscar):
 * probado en vivo, solo devuelve expedientes YA cerrados — el único lugar
 * que crea o actualiza un Expediente es cerrar(), que siempre fija
 * estado:'Cerrado'. No existe un expediente "Abierto" persistido de
 * antemano para un caso que todavía no se cerró.
 */
export interface Expediente {
  id: string;
  idCaso: string;
  resultadoFinal: string | null;
  fechaCierre: string | null;
  informeOficialUrl: string | null;
  estado: string;
  caso: {
    id: string;
    estado: string;
    fechaCreacion: string;
    establecimiento: Establecimiento;
  };
}

/**
 * Forma real de una fila de `respuesta_item` (registrar-respuestas.dto.ts /
 * evaluaciones.service.ts), probada en vivo guardando una respuesta real:
 * todos los ids BigInt llegan como string; `idCriticidad` es un Int (no
 * BigInt) y llega como number o null. No incluye `codigoOpcion` ni el
 * código de criticidad directamente — solo el id numérico de la opción
 * elegida (`idOpcionRespuesta`), que hay que resolver contra
 * `opcionesRespuesta` de useFichaVigente() para saber qué código es.
 */
export interface RespuestaItemRaw {
  id: string;
  idEvaluacion: string;
  idItemFicha: string;
  idOpcionRespuesta: string;
  idCriticidad: number | null;
  valorAplicado: string | null;
  pesoAplicado: string;
  excluidoDelCalculo: boolean;
  observacion: string | null;
  uuidLocal: string;
  sincronizado: boolean;
}

/**
 * Forma real de GET /api/v1/evaluaciones/:id (evaluaciones.service.ts,
 * obtener), probada en vivo. `ultimaAccionCoordinador` es un agregado que
 * arma el backend a partir del historial (DEVOLVER y SOLICITAR_CORRECCION
 * comparten el mismo `estado.codigo` DEVUELTA; esta es la única forma de
 * saber cuál de las dos eligió el Coordinador).
 */
export interface EvaluacionDetalle {
  id: string;
  idCaso: string;
  idEstablecimiento: string;
  idVersionFicha: string;
  idEvaluador: string;
  idEstado: number;
  bloqueada: boolean;
  fechaInicio: string | null;
  fechaFinalizacion: string | null;
  establecimiento: Establecimiento;
  versionFicha: {
    id: string;
    numeroVersion: string;
    nombre: string;
    totalItemsEvaluables: number;
    puntajeTotalPosible: string;
  };
  estado: {
    id: number;
    codigo: string;
    nombre: string;
    esFinal: boolean;
    bloqueaDatos: boolean;
    orden: number;
  };
  respuestas: RespuestaItemRaw[];
  evidencias?: Evidencia[];
  ultimaAccionCoordinador: string | null;
  caso?: { id: string; estado: string } | null;
  calculoRiesgo?: ResultadoRiesgo | null;
}

/**
 * Forma real de POST /api/v1/evidencias (evidencias.service.ts), probada
 * en vivo subiendo un archivo real (magic bytes, no por extensión).
 * `idRespuestaItem` es el id de la fila `respuesta_item` (NO el id del
 * ítem del catálogo) -- por eso solo se puede asociar una evidencia a un
 * criterio DESPUÉS de haberlo respondido al menos una vez; sin ese campo,
 * queda asociada a la evaluación en general. Confirmado también que el
 * backend rechaza la subida (403) si la evaluación ya está bloqueada.
 * latitud/longitud son Decimal -- llegan como string cuando no son null,
 * mismo patrón que el resto de la sesión.
 */
export interface Evidencia {
  id: string;
  uuidLocal: string;
  idEvaluacion: string;
  idRespuestaItem: string | null;
  tipo: 'FOTO' | 'VIDEO' | 'DOCUMENTO';
  nombreArchivo: string;
  rutaAlmacenamiento: string | null;
  tipoMime: string | null;
  tamanoBytes: string | null;
  hashSha256: string | null;
  latitud: string | null;
  longitud: string | null;
  comentario: string | null;
  fechaCaptura: string;
  sincronizado: boolean;
}

/**
 * Forma real de GET /api/v1/motor-riesgo/catalogo, probada en vivo. A
 * diferencia de la mayoría de los endpoints de esta sesión, este SÍ
 * convierte los Decimal a number del lado del servidor (el service hace
 * Number(...) explícito antes de responder), así que peso/puntaje/
 * limiteInf/limiteSup llegan como number, no como string.
 */
export interface FactorRiesgo {
  id: string;
  numero: number;
  nombre: string;
  peso: number;
  esAutomatico: boolean;
  opciones: {
    id: string;
    descripcion: string;
    puntaje: number;
    limiteInf: number | null;
    limiteSup: number | null;
  }[];
}

export interface RangoFrecuenciaRiesgo {
  id: string;
  limiteInferior: number;
  limiteSuperior: number | null;
  incluyeInferior: boolean;
  incluyeSuperior: boolean;
  nivelRiesgo: string;
  frecuencia: string;
  mesesHastaProxima: number;
}

export interface CatalogoMotorRiesgo {
  idVersionFicha: string;
  idVersionMatriz: string;
  reglaAprobacion: {
    porcentajeMinimoAprobacion: number;
    maxNcCriticas: number;
    maxNcMayores: number;
    porcentajePermisoSanitario: number;
  };
  factores: FactorRiesgo[];
  rangosCalificacion: {
    limiteInferior: number;
    limiteSuperior: number;
    incluyeInferior: boolean;
    incluyeSuperior: boolean;
    descripcion: string;
    accion: string;
  }[];
  rangosFrecuencia: RangoFrecuenciaRiesgo[];
}

/**
 * Forma de POST /api/v1/motor-riesgo/calcular -- CONFIRMADA EN VIVO (2026-09-08)
 * tras el fix de Gabriela al package.json de @ebr/risk-engine (agregó las
 * condiciones "require" y "default" apuntando al mismo build ESM; Node 24
 * soporta require() de ESM síncrono, así que ya no hace falta CJS aparte).
 * Coincide exactamente con lo que ya estaba tipado acá (patrón
 * Decimal-como-string, igual que el resto de la sesión) -- solo faltaban
 * estos dos campos, que sí vinieron en la respuesta real (ambos `null` en
 * la prueba, son FKs opcionales): idSubcategoriaRp e idRangoCalificacion.
 *
 * idNivelRiesgo es un id numérico (FK), no el código legible (BAJO/MEDIO/
 * ALTO) -- no hay forma de resolverlo directamente en un GET, así que en
 * pantalla se deriva cruzando `frecuencia` contra
 * CatalogoMotorRiesgo.rangosFrecuencia (frecuencia y nivelRiesgo son 1:1
 * por rango).
 *
 * NOTA aparte (no es parte de este bug, es un hueco de datos distinto):
 * para que /calcular llegue a 200 hace falta además que el establecimiento
 * tenga categorías de alimento asignadas (POST /categorias-alimento/asignar)
 * y que la versión de ficha activa tenga rango_calificacion cargado -- en
 * la base de Docker actual, rango_calificacion está vacío para la versión
 * de ficha vigente (confirmado en vivo, GET /motor-riesgo/catalogo devuelve
 * rangosCalificacion: []). Se sembraron filas de prueba solo para verificar
 * esta forma y se borraron después -- falta cargarlo de verdad.
 */
export interface ResultadoRiesgo {
  id: string;
  idEvaluacion: string;
  idNivelRiesgo: number | null;
  idSubcategoriaRp: string | null;
  idRangoCalificacion: string | null;
  porcentajeCumplimiento: string | null;
  rpValor: string | null;
  reValor: string | null;
  rtValor: string | null;
  frecuencia: string | null;
  puntosObtenidos: string | null;
  puntosExcluidosNa: string | null;
  puntajeTotalPosible: string | null;
  denominadorEfectivo: string | null;
  itemsRespondidos: number | null;
  itemsNa: number | null;
  calificacionTexto: string | null;
  aprueba: boolean | null;
  otorgaPermisoSanitario: boolean;
  ncCriticas: number;
  ncMayores: number;
  ncMenores: number;
  fechaProximaInspeccion: string | null;
  fechaCalculo: string;
  reDetalle: { numero: number; factor: string; puntaje: number; peso: number; aporte: number }[] | null;
}

/**
 * Forma real de GET /api/v1/casos/historico (casos.service.ts,
 * buscarHistorico), probada en vivo con dos casos reales (uno sin
 * evaluación/expediente, otro con ambos). `establecimiento.empresa` viene
 * recortado a solo `{id, razonSocial}` (select explícito en el service),
 * a diferencia de CasoDetalle que trae la Empresa completa.
 */
export interface CasoHistorico {
  id: string;
  idEstablecimiento: string;
  idOrigen: number | null;
  idSolicitud: string | null;
  idAlerta: string | null;
  idDenuncia: string | null;
  idProgramacion: string | null;
  estado: string;
  prioridad: string | null;
  fechaCreacion: string;
  establecimiento: Omit<Establecimiento, 'empresa'> & { empresa: { id: string; razonSocial: string } };
  origen: OrigenCaso | null;
  solicitud: SolicitudBpm | null;
  evaluaciones: { id: string; idEstado: number | null; fechaFinalizacion: string | null }[];
  expediente: {
    id: string;
    idCaso: string;
    resultadoFinal: string | null;
    fechaCierre: string | null;
    informeOficialUrl: string | null;
    estado: string;
  } | null;
}

/**
 * Filtros de GET /api/v1/casos/historico, confirmados en vivo (2026-09-08
 * y re-confirmados 2026-09-09 tras los PR #19/#21/#23/#24/#25, sin
 * cambios). `estado` solo acepta los valores reales que usa caso.estado
 * (Pendiente/Asignado/Cerrado) desde el fix del PR #22 — la lista vieja
 * del DTO (Abierto/En Evaluacion/etc.) nunca coincidió con datos reales.
 * Roles internos (Administrador/Coordinador/Técnico) ven todo y pueden
 * filtrar por cualquier empresaId; roles de Empresa solo ven la suya —
 * el servidor fuerza su propio empresaId server-side e ignora cualquier
 * otro que se intente mandar.
 */
export interface FiltrosCasosHistorico {
  empresaId?: string;
  solicitudId?: string;
  evaluacionId?: string;
  estado?: 'Pendiente' | 'Asignado' | 'Cerrado';
  fechaCreacionDesde?: string;
  fechaCreacionHasta?: string;
}

export interface Notificacion {
  id: string;
  idUsuario: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidad: string | null;
  idEntidad: string | null;
  leida: boolean;
  fechaCreacion: string;
}
