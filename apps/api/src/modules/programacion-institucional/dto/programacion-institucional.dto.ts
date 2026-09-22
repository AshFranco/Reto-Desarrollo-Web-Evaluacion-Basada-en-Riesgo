import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearProgramacionInstitucionalDto {
  @ApiProperty({ description: 'ID del establecimiento a inspeccionar' })
  @IsNotEmpty()
  @IsString()
  idEstablecimiento: string;

  @ApiPropertyOptional({ description: 'ID de la evaluación previa origen (si aplica)' })
  @IsOptional()
  @IsString()
  idEvaluacionOrigen?: string;

  @ApiProperty({ description: 'Fecha programada para la inspección (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  fechaProgramada: string;

  @ApiPropertyOptional({ description: 'Frecuencia aplicada (ej. SEMESTRAL, ANUAL, ALTA_PRIORIDAD)' })
  @IsOptional()
  @IsString()
  frecuenciaAplicada?: string;

  @ApiPropertyOptional({ description: 'Indica si la programación fue generada automáticamente' })
  @IsOptional()
  @IsBoolean()
  generadaAutomatica?: boolean;

  @ApiPropertyOptional({ description: 'Prioridad de la programación (NORMAL, ALTA, URGENTE)' })
  @IsOptional()
  @IsString()
  prioridad?: string;

  @ApiPropertyOptional({ description: 'Observaciones o notas adicionales' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ActualizarProgramacionInstitucionalDto {
  @ApiPropertyOptional({ description: 'Fecha programada' })
  @IsOptional()
  @IsDateString()
  fechaProgramada?: string;

  @ApiPropertyOptional({ description: 'Prioridad' })
  @IsOptional()
  @IsString()
  prioridad?: string;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
