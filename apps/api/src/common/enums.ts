/**
 * Enums de dominio, definidos aquí como TypeScript puro porque en el
 * esquema oficial los roles y varios catálogos son filas de tabla
 * (relaciones), no enums nativos de Postgres/Prisma.
 *
 * Los valores permitidos se siguen validando en dos capas:
 *  1) class-validator (@IsEnum) en los DTOs de entrada.
 *  2) Los propios registros de catálogo en la base de datos (tabla `rol`,
 *     `estado_evaluacion`, etc.) -- ver prisma/seed.ts.
 */

export enum RolUsuario {
  ADMINISTRADOR = 'ADMINISTRADOR',
  ADMINISTRADOR_EMPRESA = 'ADMINISTRADOR_EMPRESA',
  USUARIO_DELEGADO = 'USUARIO_DELEGADO',
  COORDINADOR = 'COORDINADOR',
  TECNICO_EVALUADOR = 'TECNICO_EVALUADOR',
}

export enum EstadoRegistro {
  PENDIENTE_VALIDACION = 'PENDIENTE_VALIDACION',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

export enum OrigenCaso {
  SOLICITUD = 'SOLICITUD',
  PROGRAMACION = 'PROGRAMACION',
  ALERTA = 'ALERTA',
  DENUNCIA = 'DENUNCIA',
}

export enum EstadoCaso {
  ABIERTO = 'ABIERTO',
  ASIGNADO = 'ASIGNADO',
  EN_EVALUACION = 'EN_EVALUACION',
  EN_REVISION = 'EN_REVISION',
  EN_CORRECCION = 'EN_CORRECCION',
  CERRADO = 'CERRADO',
  CANCELADO = 'CANCELADO',
}

export enum EstadoSolicitudBpm {
  BORRADOR = 'BORRADOR',
  PENDIENTE_ASIGNACION = 'PENDIENTE_ASIGNACION',
  ASIGNADA = 'ASIGNADA',
  EN_PROCESO = 'EN_PROCESO',
  FINALIZADA = 'FINALIZADA',
  RECHAZADA = 'RECHAZADA',
}

export enum ResultadoAlertaLapch {
  PROCEDE = 'PROCEDE',
  NO_PROCEDE = 'NO_PROCEDE',
}

export enum ResultadoDenuncia {
  PROCEDE = 'PROCEDE',
  NO_PROCEDE = 'NO_PROCEDE',
  REMISION = 'REMISION',
}

export enum PrioridadCaso {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
}

export enum EstadoEvaluacion {
  PROGRAMADA = 'PROGRAMADA',
  EN_CURSO = 'EN_CURSO',
  FINALIZADA = 'FINALIZADA',
  EN_REVISION = 'EN_REVISION',
  APROBADA = 'APROBADA',
  DEVUELTA = 'DEVUELTA',
  CERRADA = 'CERRADA',
}

export enum AccionRevisionCoordinador {
  APROBAR = 'APROBAR',
  DEVOLVER = 'DEVOLVER',
  SOLICITAR_CORRECCION = 'SOLICITAR_CORRECCION',
}

export enum NivelCriticidad {
  CRITICA = 'CRITICA', // "C" en la ficha
  MAYOR = 'MAYOR', // "M"
  MENOR = 'MENOR', // "Me"
}

export enum CodigoOpcionRespuesta {
  CUMPLE = 'CUMPLE', // C  -> 1 punto
  CUMPLE_PARCIAL = 'CUMPLE_PARCIAL', // CP -> 0.5 puntos
  INCUMPLE_TOTAL = 'INCUMPLE_TOTAL', // IT -> 0 puntos
  NO_APLICA = 'NO_APLICA', // N/A -> excluido del denominador
}

export enum NivelRiesgo {
  BAJO = 'BAJO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
}

export enum FrecuenciaInspeccion {
  ANUAL = 'ANUAL',
  SEMESTRAL = 'SEMESTRAL',
  TRIMESTRAL = 'TRIMESTRAL',
}

export enum TipoEvidencia {
  FOTO = 'FOTO',
  VIDEO = 'VIDEO',
  DOCUMENTO = 'DOCUMENTO',
}

export enum EstadoExpediente {
  ABIERTO = 'ABIERTO',
  CERRADO = 'CERRADO',
}

export enum TipoRepresentante {
  LEGAL = 'LEGAL',
  CALIDAD = 'CALIDAD',
  CONTACTO_PRINCIPAL = 'CONTACTO_PRINCIPAL',
}
