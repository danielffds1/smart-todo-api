import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuggestCategoryDto {
  @ApiProperty({ description: 'Título da tarefa' })
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @IsString({ message: 'O título deve ser um texto' })
  @MaxLength(255, { message: 'O título deve ter no máximo 255 caracteres' })
  title: string;

  @ApiProperty({ description: 'Descrição da tarefa' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto' })
  @MaxLength(1000, { message: 'A descrição deve ter no máximo 1000 caracteres' })
  description?: string;
}
