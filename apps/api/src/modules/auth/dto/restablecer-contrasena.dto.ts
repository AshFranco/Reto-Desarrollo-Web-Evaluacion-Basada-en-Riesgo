import { IsNotEmpty, IsString, MaxLength, MinLength, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'coincideContrasenaRestablecer', async: false })
class CoincideContrasenaRestablecerConstraint implements ValidatorConstraintInterface {
  validate(confirmacion: string, args: ValidationArguments) {
    const obj = args.object as Record<string, string>;
    return obj['contrasenaNueva'] === confirmacion;
  }

  defaultMessage() {
    return 'La confirmación no coincide con la nueva contraseña.';
  }
}

export class RestablecerContrasenaDto {
  @ApiProperty({ description: 'Token de restablecimiento recibido por correo', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' })
  @IsString()
  @IsNotEmpty({ message: 'El token de restablecimiento es obligatorio.' })
  token: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 8 caracteres)', example: 'NuevaClaveSegura@2026' })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(100, { message: 'La contraseña no puede exceder los 100 caracteres.' })
  contrasenaNueva: string;

  @ApiProperty({ description: 'Confirmación de la nueva contraseña', example: 'NuevaClaveSegura@2026' })
  @IsString()
  @Validate(CoincideContrasenaRestablecerConstraint)
  confirmacion: string;
}
