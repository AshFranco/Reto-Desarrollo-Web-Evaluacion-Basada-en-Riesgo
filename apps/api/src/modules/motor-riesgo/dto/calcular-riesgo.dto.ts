import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumberString,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class SeleccionFactorDto {
  @IsNumberString()
  factorId: string;

  @IsNumberString()
  opcionId: string;
}

export class CalcularRiesgoDto {
  @IsNumberString()
  evaluacionId: string;

  // Selecciones de los factores NO automáticos (todos salvo "Cumplimiento
  // BPM", que se deriva automáticamente del % de la ficha de esta misma
  // evaluación -- ver motor-riesgo.service.ts).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => SeleccionFactorDto)
  seleccionesFactores: SeleccionFactorDto[] = [];
}
