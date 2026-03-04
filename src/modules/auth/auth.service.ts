import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserEntity } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(registerDto);

    return this.generateAuthResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);


    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);


    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const userEntity = UserEntity.fromPrisma(user);

    return this.generateAuthResponse(userEntity);
  }

  async getAuthenticatedUser(userId: string): Promise<UserEntity> {
    return this.usersService.findOne(userId);
  }


  private generateAuthResponse(user: UserEntity): AuthResponseDto {
    const payload = {
      sub: user.id, 
      email: user.email,
    };

    const access_token = this.jwtService.sign(payload);

    const expiresIn = this.configService.get<string>('jwt.expiresIn');
   
    const expires_in = this.parseExpirationToSeconds(expiresIn ?? '24');

    return new AuthResponseDto(access_token, expires_in, user);
  }

  private parseExpirationToSeconds(expiration: string): number {
    const value = parseInt(expiration);
   
    if (expiration.includes('h')) {
      return value * 60 * 60; 
    }
    if (expiration.includes('d')) {
      return value * 24 * 60 * 60; 
    }
    if (expiration.includes('m')) {
      return value * 60; 
    }
   
    return value; 
  }
}
