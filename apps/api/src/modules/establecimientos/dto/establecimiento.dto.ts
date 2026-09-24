import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CrearEstablecimientoDto {
  @IsOptional() @IsNumberString({}, { message: 'El identificador de empresa debe ser un número.' }) empresaId?: string;
  @IsString({ message: 'El nombre es obligatorio.' }) @MaxLength(200, { message: 'El nombre no puede superar los 200 caracteres.' }) nombre: string;
  @IsOptional() @IsString({ message: 'La calle debe ser texto.' }) @MaxLength(300, { message: 'La dirección no puede superar los 300 caracteres.' }) calle?: string;
  @IsOptional() @IsNumberString({}, { message: 'El identificador de municipio debe ser un número.' }) idMunicipio?: string;
  @IsOptional() @IsNumberString({}, { message: 'El identificador de DPS/DAS debe ser un número.' }) idDpsDas?: string;
  @IsOptional() @IsString({ message: 'El teléfono debe ser texto.' }) @MaxLength(20, { message: 'El teléfono no puede superar los 20 caracteres.' }) telefono?: string;
  @IsOptional() @IsEmail({}, { message: 'El correo electrónico no es válido.' }) correo?: string;
  @IsOptional() @IsDateString({}, { message: 'La fecha de inicio de operaciones no es válida.' }) fechaInicioOperaciones?: string;
  @IsOptional() @IsString({ message: 'El número de permiso sanitario debe ser texto.' }) @MaxLength(50, { message: 'El número de permiso no puede superar los 50 caracteres.' }) numeroPermisoSanitario?: string;
  @IsOptional() @IsDateString({}, { message: 'La fecha de vencimiento del permiso no es válida.' }) fechaVencimientoPermiso?: string;
  @IsOptional() @IsNumber({}, { message: 'La producción anual debe ser un número.' }) @Min(0, { message: 'La producción anual debe ser un valor positivo.' }) @Max(999999999999, { message: 'La producción anual no puede superar el límite permitido.' }) produccionAnual?: number;
  @IsOptional() @IsNumber({}, { message: 'El número de empleados masculinos debe ser un número.' }) @Min(0, { message: 'El número de empleados no puede ser negativo.' }) @Max(2147483647, { message: 'El número de empleados masculinos supera el límite permitido.' }) empleadosMasculino?: number;
  @IsOptional() @IsNumber({}, { message: 'El número de empleadas femeninas debe ser un número.' }) @Min(0, { message: 'El número de empleadas no puede ser negativo.' }) @Max(2147483647, { message: 'El número de empleadas femeninas supera el límite permitido.' }) empleadosFemenino?: number;
  @IsOptional() @IsString({ message: 'El mercado objetivo debe ser texto.' }) @MaxLength(150, { message: 'El mercado objetivo no puede superar los 150 caracteres.' }) mercadoObjetivo?: string;
  @IsOptional() @IsNumber({}, { message: 'La latitud debe ser un número.' }) latitud?: number;
  @IsOptional() @IsNumber({}, { message: 'La longitud debe ser un número.' }) longitud?: number;
}

export class ActualizarEstablecimientoDto extends CrearEstablecimientoDto {
  @IsOptional() @IsBoolean({ message: 'El campo activo debe ser verdadero o falso.' }) activo?: boolean;
}
