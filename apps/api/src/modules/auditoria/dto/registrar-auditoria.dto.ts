import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegistrarAuditoriaDto {
  @ApiProperty({ description: 'Nombre de la entidad auditada (ej. Evaluacion, Usuario, Caso)' })
  @IsString()
  entidad: string;

  @ApiPropertyOptional({ description: 'ID de la entidad auditada' })
  @IsOptional()
  @IsString()
  idEntidad?: string;

  @ApiProperty({ description: 'Acción realizada (ej. CREACION, ACTUALIZACION, REENVIO, LOGIN)' })
  @IsString()
  accion: string;

  @ApiPropertyOptional({ description: 'ID del usuario que ejecutó la acción' })
  @IsOptional()
  idUsuario?: string | number | bigint;

  @ApiPropertyOptional({ description: 'Dirección IP del cliente' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({ description: 'Valores o estado anterior de la entidad' })
  @IsOptional()
  @IsObject()
  valoresAnteriores?: any;

  @ApiPropertyOptional({ description: 'Valores o estado nuevo de la entidad' })
  @IsOptional()
  @IsObject()
  valoresNuevos?: any;
}

export class BuscarAuditoriaQuery {
  @ApiPropertyOptional({ description: 'Filtrar por entidad' })
  @IsOptional()
  @IsString()
  entidad?: string;

  @ApiPropertyOptional({ description: 'Filtrar por acción' })
  @IsOptional()
  @IsString()
  accion?: string;

  @ApiPropertyOptional({ description: 'Filtrar por usuario ID' })
  @IsOptional()
  @IsString()
  idUsuario?: string;
}
