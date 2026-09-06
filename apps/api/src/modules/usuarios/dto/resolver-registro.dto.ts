import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolverRegistroDto {
  @IsIn(['APROBADO', 'RECHAZADO'])
  decision: 'APROBADO' | 'RECHAZADO';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoRechazo?: string;
}
