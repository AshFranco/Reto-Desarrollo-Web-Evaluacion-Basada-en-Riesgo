import { IsEmail, IsNumberString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CrearEmpresaDto {
  @IsString({ message: 'La razón social es obligatoria.' }) @MaxLength(200, { message: 'La razón social no puede superar los 200 caracteres.' }) razonSocial: string;
  @Matches(/^[0-9-]{9,20}$/, { message: 'El RNC no es válido. Debe contener entre 9 y 20 dígitos numéricos.' }) rnc: string;
  @IsOptional() @IsString({ message: 'El nombre comercial debe ser texto.' }) @MaxLength(200, { message: 'El nombre comercial no puede superar los 200 caracteres.' }) nombreComercial?: string;
  @IsOptional() @IsString({ message: 'La dirección debe ser texto.' }) @MaxLength(255, { message: 'La dirección no puede superar los 255 caracteres.' }) direccion?: string;
  @IsOptional() @IsNumberString({}, { message: 'El identificador de municipio debe ser un número.' }) idMunicipio?: string;
  @IsOptional() @IsString({ message: 'El teléfono debe ser texto.' }) @MaxLength(20, { message: 'El teléfono no puede superar los 20 caracteres.' }) telefono?: string;
  @IsOptional() @IsEmail({}, { message: 'El correo electrónico no es válido.' }) correo?: string;
  @IsOptional() @IsString({ message: 'La actividad económica debe ser texto.' }) @MaxLength(150, { message: 'La actividad económica no puede superar los 150 caracteres.' }) actividadEconomica?: string;
}

export class ActualizarEmpresaDto extends CrearEmpresaDto {}

export class InvitarDelegadoDto {
  @IsString({ message: 'El nombre completo es obligatorio.' })
  nombreCompleto: string;

  @IsString({ message: 'El documento de identidad es obligatorio.' })
  cedulaPasaporte: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  correoElectronico: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  contrasena?: string;
}

export class CambiarEstadoDelegadoDto {
  @IsString({ message: 'El estado es obligatorio.' })
  estado: string; // APROBADO, INACTIVO, RECHAZADO
}

