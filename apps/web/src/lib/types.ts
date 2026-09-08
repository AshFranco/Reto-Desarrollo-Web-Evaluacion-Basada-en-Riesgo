export interface UsuarioLocal {
  id: string;
  nombreCompleto: string;
  rol: string;
  empresaId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  usuario: UsuarioLocal;
}

export interface NodoCatalogo {
  id: string;
  idPadre: string | null;
  numeracion: string;
  titulo: string;
  nivel: number;
  orden: number;
  esEvaluable: boolean;
  peso: number;
  idCriticidad: string | null;
  hijos: NodoCatalogo[];
}

export interface OpcionRespuestaLocal {
  id: string;
  codigo: string;
  nombre: string;
  valor: number;
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

export interface OrigenCaso {
  id: string;
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
 * listarPorEvaluador): incluye el caso y su establecimiento, pero NO una
 * Evaluación ni su id — ese dato no existe en esta respuesta.
 */
export interface AsignacionMia {
  id: string;
  idCaso: string;
  idEvaluador: string;
  idCoordinador: string;
  fechaAsignacion: string;
  estado: string;
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
  idOrigen: string | null;
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
  establecimiento: { id: string; nombre: string; empresa: Empresa };
  solicitud: SolicitudBpm | null;
  alerta: { id: string; numeroAlerta: string; descripcion: string } | null;
  denuncia: { id: string; tipoDenuncia: string; descripcion: string } | null;
  programacion: { id: string; fechaProgramada: string; frecuenciaAplicada: string } | null;
  evaluaciones: { id: string; idEstado: number | null; fechaProgramada: string | null }[];
  expediente: { id: string; estado: string } | null;
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
