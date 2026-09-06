import { IsEmail, IsNumberString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CrearEmpresaDto {
  @IsString() @MaxLength(200) razonSocial: string;
  @Matches(/^[0-9-]{9,20}$/, { message: 'RNC inválido' }) rnc: string;
  @IsOptional() @IsString() @MaxLength(200) nombreComercial?: string;
  @IsOptional() @IsString() @MaxLength(255) direccion?: string;
  @IsOptional() @IsNumberString() idMunicipio?: string;
  @IsOptional() @IsString() @MaxLength(20) telefono?: string;
  @IsOptional() @IsEmail() correo?: string;
  @IsOptional() @IsString() @MaxLength(150) actividadEconomica?: string;
}

export class ActualizarEmpresaDto extends CrearEmpresaDto {}
