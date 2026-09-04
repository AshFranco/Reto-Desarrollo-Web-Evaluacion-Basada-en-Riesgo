import { IsIn, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerarInformeDto {
  @IsNumberString()
  evaluacionId: string;

  @IsOptional() @IsString() resumenEjecutivo?: string;
  @IsOptional() @IsString() hallazgos?: string;
  @IsOptional() @IsString() noConformidades?: string;
  @IsOptional() @IsString() recomendaciones?: string;
}

export class RevisarInformeDto {
  @IsIn(['APROBAR', 'DEVOLVER', 'SOLICITAR_CORRECCION'])
  accion: 'APROBAR' | 'DEVOLVER' | 'SOLICITAR_CORRECCION';

  @IsOptional() @IsString() @MaxLength(2000) observaciones?: string;
}
