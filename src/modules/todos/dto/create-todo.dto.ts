import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsEnum,
    MinLength,
    MaxLength,
    IsDateString,
  } from 'class-validator';
  import { TodoStatus, TodoPriority } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
 
  export class CreateTodoDto {
    @ApiProperty({ example: 'Tarefa de exemplo', minLength: 3, maxLength: 255 })
    @IsNotEmpty({ message: 'O título é obrigatório' })
    @IsString({ message: 'O título deve ser um texto' })
    @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres' })
    @MaxLength(255, { message: 'O título deve ter no máximo 255 caracteres' })
    title: string;
    
    @ApiProperty({ example: 'Descrição da tarefa', maxLength: 1000 })
    @IsOptional()
    @IsString({ message: 'A descrição deve ser um texto' })
    @MaxLength(1000, { message: 'A descrição deve ter no máximo 1000 caracteres' })
    description?: string;
    
    @ApiProperty({ example: 'PENDING', enum: TodoStatus })
    @IsOptional()
    @IsEnum(TodoStatus, { message: 'Status inválido. Use: PENDING, IN_PROGRESS ou COMPLETED' })
    status?: TodoStatus;
    
    @ApiProperty({ example: 'LOW', enum: TodoPriority })
    @IsOptional()
    @IsEnum(TodoPriority, { message: 'Prioridade inválida. Use: LOW, MEDIUM ou HIGH' })
    priority?: TodoPriority;
 
    @ApiProperty({ example: 'Categoria da tarefa', maxLength: 100 })
    @IsOptional()
    @IsString({ message: 'A categoria deve ser um texto' })
    @MaxLength(100, { message: 'A categoria deve ter no máximo 100 caracteres' })
    category?: string;
 
    @ApiProperty({ example: 'Cidade da tarefa', maxLength: 100 })
    @IsOptional()
    @IsString({ message: 'A cidade deve ser um texto' })
    @MaxLength(100, { message: 'A cidade deve ter no máximo 100 caracteres' })
    city?: string;


    @ApiProperty({ example: 'Data de início da tarefa', format: 'date-time' })
    @IsOptional()
    @IsDateString({}, { message: 'startDate deve ser uma data em ISO (ex: 2025-02-10)' })
    startDate?: string;


    @ApiProperty({ example: 'Data de término da tarefa', format: 'date-time' })
    @IsOptional()
    @IsDateString({}, { message: 'endDate deve ser uma data em ISO' })
    endDate?: string;
}
