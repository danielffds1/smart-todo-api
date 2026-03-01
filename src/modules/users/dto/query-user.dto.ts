import { IsOptional, IsInt, Min, Max, MinLength, MaxLength, IsString, IsEmail } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryUserDto {
  @ApiPropertyOptional({ description: 'Filtrar por nome', minLength: 3, maxLength: 255 })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto' })
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres' })
  @MaxLength(255, { message: 'O nome deve ter no máximo 255 caracteres' })
  name?: string;

  @ApiPropertyOptional({ description: 'Filtrar por email' })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @ApiPropertyOptional({ description: 'Limite de itens', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit deve ser um número inteiro' })
  @Min(1, { message: 'Limit mínimo é 1' })
  @Max(100, { message: 'Limit máximo é 100' })
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset para paginação', default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Offset deve ser um número inteiro' })
  @Min(0, { message: 'Offset mínimo é 0' })
  offset?: number;
}