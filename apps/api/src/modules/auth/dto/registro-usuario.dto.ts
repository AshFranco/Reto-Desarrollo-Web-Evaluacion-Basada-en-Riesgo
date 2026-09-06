import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum RolRegistrable {
  ADMINISTRADOR_EMPRESA = 'ADMINISTRADOR_EMPRESA',
  USUARIO_DELEGADO = 'USUARIO_DELEGADO',
}

/**
 * DTO de registro (RF-02). Nota de seguridad: NO incluye un campo `rol`
 * libre ni `estado` — el rol permitido se restringe al enum RolRegistrable
 * y el estado inicial siempre es PENDIENTE_VALIDACION, fijado en el servicio,
 * nunca aceptado desde el cliente (evita escalamiento de privilegios).
 */
export class RegistroUsuarioDto {
  @IsString()
  @MaxLength(150)
  nombreCompleto: string;

  @IsString()
  @Matches(/^[0-9-]{9,15}$/, { message: 'Cédula/Pasaporte inválido' })
  cedulaPasaporte: string;

  @IsEmail()
  @MaxLength(255)
  correo: string;

  @IsOptional()
  @IsPhoneNumber('DO')
  telefono?: string;

  // Política de contraseña: min 12 caracteres, mayúscula, minúscula, número y símbolo.
  @IsString()
  @MinLength(12, { message: 'La contraseña debe tener al menos 12 caracteres' })
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message:
      'La contraseña debe incluir mayúscula, minúscula, número y carácter especial',
  })
  password: string;

  @IsEnum(RolRegistrable)
  rol: RolRegistrable;

  // ID de empresa: se valida contra el catálogo real en el servicio;
  // nunca se acepta un objeto "empresa" completo desde el cliente.
  @IsString()
  empresaId: string;
}
