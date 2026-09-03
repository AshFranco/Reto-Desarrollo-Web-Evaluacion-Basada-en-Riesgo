import { IsIn, IsLatitude, IsLongitude, IsNumberString, IsOptional } from 'class-validator';

export class SubirEvidenciaDto {
  @IsNumberString()
  evaluacionId: string;

  @IsOptional()
  @IsNumberString()
  respuestaItemId?: string;

  @IsIn(['FOTO', 'VIDEO', 'DOCUMENTO'])
  tipo: string;

  @IsOptional()
  @IsLatitude()
  latitud?: number;

  @IsOptional()
  @IsLongitude()
  longitud?: number;
}
