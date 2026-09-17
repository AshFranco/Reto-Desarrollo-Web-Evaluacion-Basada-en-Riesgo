import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarPerfilDto {
  @ApiPropertyOptional({ description: 'Nombre completo del usuario', example: 'Juan Carlos Pérez' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres.' })
  @MaxLength(150, { message: 'El nombre no puede exceder 150 caracteres.' })
  nombreCompleto?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto del usuario', example: '809-555-1234' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres.' })
  telefono?: string;

  @ApiPropertyOptional({ description: 'Estado de activación de doble factor (2FA)', example: false })
  @IsOptional()
  @IsBoolean()
  dobleFactorActivo?: boolean;
}
