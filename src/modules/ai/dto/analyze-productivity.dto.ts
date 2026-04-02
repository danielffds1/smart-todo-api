import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';


export class AnalyzeProductivityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Days deve ser um número inteiro' })
  @Min(1, { message: 'Days mínimo é 1' })
  days?: number = 7;
}
