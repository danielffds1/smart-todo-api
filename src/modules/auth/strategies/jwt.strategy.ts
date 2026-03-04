import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/common/prisma/prisma.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ExtractJwt } from "passport-jwt";
import { UserEntity } from "src/modules/users/entities/user.entity";

export interface JwtPayload {
    sub: string; 
    email: string;
}


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Extrai do header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, 
      secretOrKey: configService.get<string>('jwt.secret') ?? 'seu_secret_super_seguro', 
    });
  }

  async validate(payload: JwtPayload){
    const user = await this.prisma.user.findFirst({
        where: {
            id: payload.sub,
            deletedAt: null, 
        }
    });

    if(!user){
        throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
