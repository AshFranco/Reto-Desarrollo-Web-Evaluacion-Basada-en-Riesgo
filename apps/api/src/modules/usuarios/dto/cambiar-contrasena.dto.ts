import { IsString, MinLength, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'coincideContrasena', async: false })
class CoincideContrasenaConstraint implements ValidatorConstraintInterface {
  validate(confirmacion: string, args: ValidationArguments) {
    const obj = args.object as Record<string, string>;
    return obj['contrasenaNueva'] === confirmacion;
  }

  defaultMessage() {
    return 'La confirmación no coincide con la nueva contraseña.';
  }
}

export class CambiarContrasenaDto {
  @ApiProperty({ description: 'Contraseña actual del usuario', example: 'MiContraseña@123' })
  @IsString()
  @MinLength(1, { message: 'Debe indicar su contraseña actual.' })
  contrasenaActual: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 8 caracteres)', example: 'NuevaContraseña@456' })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  contrasenaNueva: string;

  @ApiProperty({ description: 'Confirmación de la nueva contraseña', example: 'NuevaContraseña@456' })
  @IsString()
  @Validate(CoincideContrasenaConstraint)
  confirmacion: string;
}
