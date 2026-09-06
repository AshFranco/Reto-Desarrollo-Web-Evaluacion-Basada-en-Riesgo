import { IsDateString, IsIn, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearDenunciaDto {
  @IsOptional() @IsString() @MaxLength(100) tipoDenuncia?: string;
  @IsDateString() fechaRecepcion: string;
  @IsOptional() @IsString() @MaxLength(150) denunciante?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsNumberString() empresaId?: string;
  @IsOptional() @IsNumberString() establecimientoId?: string;
}

export class ResolverDenunciaDto {
  @IsIn(['PROCEDE', 'NO_PROCEDE', 'REMISION'])
  resultado: 'PROCEDE' | 'NO_PROCEDE' | 'REMISION';
}
