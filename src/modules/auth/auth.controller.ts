import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { User } from '@prisma/client';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {
    }

    @Post('register') 
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Registra um novo usuário' })
    @ApiBody({ type: RegisterDto })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Usuário registrado com sucesso' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
    @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email já está em uso' })
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de um usuário' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Credenciais inválidas' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard) 
  @ApiOperation({ summary: 'Obtém o perfil do usuário autenticado' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Perfil do usuário autenticado' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Token inválido' })
  getProfile(@GetUser() user: User) {
      return this.authService.getAuthenticatedUser(user.id);
  }
}
