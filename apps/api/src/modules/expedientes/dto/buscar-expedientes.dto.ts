import { IsDateString, IsIn, IsNumberString, IsOptional } from 'class-validator';

export class BuscarExpedientesQuery {
  @IsOptional() @IsNumberString() empresaId?: string;
  @IsOptional() @IsIn(['Abierto', 'Cerrado']) estado?: string;
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
}
