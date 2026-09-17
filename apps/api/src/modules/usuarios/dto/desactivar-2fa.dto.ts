import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Desactivar2FaDto {
  @ApiProperty({ description: 'Contraseña actual del usuario para confirmar la desactivación', example: 'MiContraseña@123' })
  @IsString()
  @IsNotEmpty({ message: 'Debe ingresar su contraseña actual para confirmar la desactivación.' })
  contrasenaActual: string;
}
