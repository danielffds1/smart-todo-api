import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GenerateDescriptionDto {
  @ApiProperty({ description: 'Título da tarefa' })
  @ApiProperty({ example: 'Título da tarefa' })
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @IsString({ message: 'O título deve ser um texto' })
  @MaxLength(255, { message: 'O título deve ter no máximo 255 caracteres' })
  title: string;
}
