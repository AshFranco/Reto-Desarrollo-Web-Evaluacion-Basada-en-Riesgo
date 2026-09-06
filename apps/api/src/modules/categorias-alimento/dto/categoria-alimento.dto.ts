import { IsNumberString } from 'class-validator';

export class AsignarCategoriaDto {
  @IsNumberString()
  establecimientoId: string;

  @IsNumberString()
  subcategoriaId: string;
}
