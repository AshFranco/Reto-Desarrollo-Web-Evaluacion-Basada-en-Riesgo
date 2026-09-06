import { IsDateString, IsIn, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearAlertaLapchDto {
  @IsString() @MaxLength(50) numeroAlerta: string;
  @IsDateString() fecha: string;
  @IsOptional() @IsString() @MaxLength(150) producto?: string;
  @IsOptional() @IsNumberString() empresaId?: string;
  @IsOptional() @IsNumberString() establecimientoId?: string;
  @IsOptional() @IsString() descripcion?: string;
}

export class ResolverAlertaLapchDto {
  @IsIn(['PROCEDE', 'NO_PROCEDE'])
  resultado: 'PROCEDE' | 'NO_PROCEDE';
}
