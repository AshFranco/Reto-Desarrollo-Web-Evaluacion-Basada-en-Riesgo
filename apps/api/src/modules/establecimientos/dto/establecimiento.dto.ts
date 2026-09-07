import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearEstablecimientoDto {
  @IsOptional() @IsNumberString() empresaId?: string; // opcional para roles de empresa (se infiere de su propio usuario)
  @IsString() @MaxLength(200) nombre: string;
  @IsOptional() @IsString() @MaxLength(20) rnc?: string;
  @IsOptional() @IsString() @MaxLength(300) calle?: string;
  @IsOptional() @IsNumberString() idMunicipio?: string;
  @IsOptional() @IsNumberString() idDpsDas?: string;
  @IsOptional() @IsString() @MaxLength(20) telefono?: string;
  @IsOptional() @IsEmail() correo?: string;
  @IsOptional() @IsDateString() fechaInicioOperaciones?: string;
  @IsOptional() @IsString() @MaxLength(50) numeroPermisoSanitario?: string;
  @IsOptional() @IsDateString() fechaVencimientoPermiso?: string;
  @IsOptional() @IsNumber() produccionAnual?: number;
  @IsOptional() @IsNumber() empleadosMasculino?: number;
  @IsOptional() @IsNumber() empleadosFemenino?: number;
  @IsOptional() @IsString() @MaxLength(150) mercadoObjetivo?: string;
  @IsOptional() @IsNumber() latitud?: number;
  @IsOptional() @IsNumber() longitud?: number;
}

export class ActualizarEstablecimientoDto extends CrearEstablecimientoDto {
  @IsOptional() @IsBoolean() activo?: boolean;
}
