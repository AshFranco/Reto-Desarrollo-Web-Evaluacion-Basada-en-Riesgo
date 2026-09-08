import { IsDateString, IsIn, IsNumberString, IsOptional } from 'class-validator';

export class BuscarCasosHistoricoQuery {
  @IsOptional() @IsNumberString() empresaId?: string;
  @IsOptional() @IsNumberString() solicitudId?: string;
  @IsOptional() @IsNumberString() evaluacionId?: string;
  @IsOptional()
  @IsIn(['Pendiente', 'Abierto', 'Asignado', 'En Evaluacion', 'En Revision', 'En Correccion', 'Cerrado', 'Cancelado'])
  estado?: string;
  @IsOptional() @IsDateString() fechaCreacionDesde?: string;
  @IsOptional() @IsDateString() fechaCreacionHasta?: string;
}
