import { IsIn, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearSolicitudBpmDto {
  @IsString() @MaxLength(100) tipoEstablecimiento: string;
  @IsString() @MaxLength(255) motivo: string;
  @IsOptional() @IsString() observaciones?: string;
}

export class SubirAdjuntoSolicitudDto {
  @IsIn(['CROQUIS', 'MEMORIA_DESCRIPTIVA', 'OTRO'])
  tipo: string;
}

/**
 * El esquema oficial NO guarda establecimiento_id en solicitud_bpm, pero
 * `caso.id_establecimiento` es obligatorio -- por eso se pide aquí, al
 * momento de enviar, qué establecimiento de la empresa origina el caso.
 */
export class EnviarSolicitudDto {
  @IsNumberString()
  establecimientoId: string;
}
