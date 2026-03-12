import { IsEnum, IsNotEmpty } from 'class-validator';
import { TodoStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatusDto {
  @ApiProperty({ example: 'PENDING', enum: TodoStatus })
  @IsNotEmpty({ message: 'O status é obrigatório' })
  @IsEnum(TodoStatus, { message: 'Status inválido. Use: PENDING, IN_PROGRESS ou COMPLETED' })
  status: TodoStatus;
}
