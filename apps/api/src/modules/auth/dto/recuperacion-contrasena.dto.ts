import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SolicitudRecuperacionDto {
  @IsEmail()
  @MaxLength(150)
  correo: string;
}

export class ResetContrasenaDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(12, { message: 'La contraseña debe tener al menos 12 caracteres' })
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message: 'La contraseña debe incluir mayúscula, minúscula, número y carácter especial',
  })
  nuevaContrasena: string;
}
