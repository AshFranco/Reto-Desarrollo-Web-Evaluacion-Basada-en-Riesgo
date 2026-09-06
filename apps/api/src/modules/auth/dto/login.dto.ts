import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Correo inválido' })
  @MaxLength(255)
  correo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;

  // Token del proveedor de captcha (hCaptcha/reCAPTCHA), validado en el servidor.
  @IsString()
  @IsNotEmpty({ message: 'Verificación anti-bot requerida' })
  captchaToken: string;

  // Código TOTP, requerido solo si el usuario tiene MFA habilitado.
  @IsOptional()
  @IsString()
  @MaxLength(10)
  codigoMfa?: string;
}
