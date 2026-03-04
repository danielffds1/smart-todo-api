import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength, MaxLength, IsEmail } from "class-validator";

export class RegisterDto {
    @ApiProperty({ description: 'O nome do usuário', example: 'John Doe' })
    @IsNotEmpty({ message: 'O nome é obrigatório' })
    @IsString({ message: 'O nome deve ser um texto' })
    @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres' })
    @MaxLength(255, { message: 'O nome deve ter no máximo 255 caracteres' })
    name: string;

    @ApiProperty({ description: 'O email do usuário', example: 'john.doe@example.com' })
    @IsNotEmpty({ message: 'O email é obrigatório' })
    @IsEmail({}, { message: 'Email inválido' })
    email: string;

    @ApiProperty({ description: 'A senha do usuário', example: '123456' })
    @IsNotEmpty({ message: 'A senha é obrigatória' })
    @IsString({ message: 'A senha deve ser um texto' })
    @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
    password: string;
}
