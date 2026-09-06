import { IsNumberString } from 'class-validator';

export class AsignarEvaluadorDto {
  @IsNumberString()
  casoId: string;

  @IsNumberString()
  evaluadorId: string;
}
