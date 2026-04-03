import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum PeriodType {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class PeriodFilterDto {
  @IsOptional()
  @IsEnum(PeriodType, { message: 'Período inválido' })
  period?: PeriodType = PeriodType.MONTH;

  @IsOptional()
  @IsDateString({}, { message: 'Data inicial inválida' })
  start_date?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data final inválida' })
  end_date?: string;
}
