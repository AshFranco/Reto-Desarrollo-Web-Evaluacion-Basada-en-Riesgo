import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class RespuestaItemDto {
  @IsNumberString()
  itemId: string;

  @IsIn(['C', 'CP', 'IT', 'N/A'])
  codigoOpcion: string;

  // Solo requerido cuando el técnico marca CP o IT (hallazgo real).
  @IsOptional()
  @IsIn(['C', 'M', 'Me'])
  nivelCriticidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacion?: string;
}

export class RegistrarRespuestasDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RespuestaItemDto)
  respuestas: RespuestaItemDto[];
}

export class FinalizarEvaluacionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacionesFinales?: string;
}
