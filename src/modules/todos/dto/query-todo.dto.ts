import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TodoStatus, TodoPriority } from '@prisma/client';


export class QueryTodoDto {
  // Paginação
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit deve ser um número inteiro' })
  @Min(1, { message: 'Limit mínimo é 1' })
  @Max(100, { message: 'Limit máximo é 100' })
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Offset deve ser um número inteiro' })
  @Min(0, { message: 'Offset mínimo é 0' })
  offset?: number = 0;

  // Filtros
  @IsOptional()
  @IsEnum(TodoStatus, { message: 'Status inválido' })
  status?: TodoStatus;

  @IsOptional()
  @IsEnum(TodoPriority, { message: 'Prioridade inválida' })
  priority?: TodoPriority;

  @IsOptional()
  @IsString({ message: 'A categoria deve ser um texto' })
  category?: string;


  @IsOptional()
  @IsString({ message: 'A cidade deve ser um texto' })
  city?: string;

  // Busca textual
  @IsOptional()
  @IsString({ message: 'O termo de busca deve ser um texto' })
  search?: string;

  // Ordenação
  @IsOptional()
  @IsString()
  sort?: 'createdAt' | 'updatedAt' | 'title' | 'priority' | 'status' = 'createdAt';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';
}
