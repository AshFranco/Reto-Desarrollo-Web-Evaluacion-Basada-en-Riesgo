import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsIn, Length } from 'class-validator';

export class InvitarDelegadoDto {
  @ApiProperty({ description: 'Nombre completo del delegado' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  nombreCompleto: string;

  @ApiProperty({ description: 'Correo electrónico (servirá para iniciar sesión)' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsNotEmpty()
  correoElectronico: string;

  @ApiProperty({ description: 'Cédula o pasaporte (usado como identificador)' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 30)
  cedulaPasaporte: string;
}

export class EstadoDelegadoDto {
  @ApiProperty({ description: 'El nuevo estado del delegado (APROBADO o INACTIVO)' })
  @IsString()
  @IsIn(['APROBADO', 'INACTIVO'], { message: 'El estado solo puede ser APROBADO o INACTIVO' })
  estado: string;
}
