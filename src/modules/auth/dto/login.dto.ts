import { IsNotEmpty, IsEmail, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
    
export class LoginDto {
    @ApiProperty({ description: 'O email do usuário', example: 'john.doe@example.com' })
    @IsNotEmpty({ message: 'O email é obrigatório' })
    @IsEmail({}, {message: 'Email inválido'})
    email: string;

    @ApiProperty({ description: 'A senha do usuário', example: '123456' })
    @IsNotEmpty({ message: 'A senha é obrigatória' })
    @IsString({ message: 'A senha deve ser um texto' })
    password: string;
}
