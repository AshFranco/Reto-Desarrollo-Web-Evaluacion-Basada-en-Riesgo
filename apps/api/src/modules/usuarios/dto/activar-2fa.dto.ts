import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Activar2FaDto {
  @ApiProperty({ description: 'Secreto TOTP Base32 generado previamente', example: 'JBSWY3DPEHPK3PXP' })
  @IsString()
  @IsNotEmpty({ message: 'El secreto de configuración es obligatorio.' })
  secreto: string;

  @ApiProperty({ description: 'Código de 6 dígitos generado por la app Google Authenticator', example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'El código de verificación debe tener exactamente 6 dígitos numéricos.' })
  codigo: string;
}
