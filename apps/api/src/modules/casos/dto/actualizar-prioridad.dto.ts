import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ActualizarPrioridadDto {
  @ApiProperty({
    description: 'Nivel de prioridad del caso',
    enum: ['BAJA', 'NORMAL', 'ALTA', 'URGENTE'],
    example: 'ALTA',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['BAJA', 'NORMAL', 'ALTA', 'URGENTE'])
  prioridad: string;
}
