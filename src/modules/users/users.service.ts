import { PrismaService } from "src/common/prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { UserEntity } from "./entities/user.entity";
import * as bcrypt from 'bcrypt';
import { QueryUserDto } from "./dto/query-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    //1. Verifica se o email já existe
    const existingUser = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
    });

    if (existingUser) {
        throw new ConflictException('Email já está em uso');
    }

    //2. Hash da senha (10rounds de salt)
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10)

    //3. Cria o usuário
    const user = await this.prisma.user.create({
        data: {
            ...createUserDto,
            password: hashedPassword,
        },
    });

    //4. Retorna a entidade do usuário
    return UserEntity.fromPrisma(user);
  }

  async findAll(query: QueryUserDto) {
    //1. Validar os parâmetros da query
    const { limit = 10, offset = 0, name, email } = query;

    //2. Monta a where clause dinâmicamente com base nos filtros
    const where: {
        deletedAt: null;
        name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
      } = { deletedAt: null };

    if (name?.trim()) {
        where.name = { contains: name.trim(), mode: 'insensitive' };
    }
    if (email?.trim()) {
        where.email = { contains: email.trim(), mode: 'insensitive' };
    }

    //2. Busca usuários não deletados (deletedAt = null)
    const [users, total] = await Promise.all([
        this.prisma.user.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
    ]);
   
    // Remove password de todos os usuários
    const usersWithoutPassword = users.map((user) => UserEntity.fromPrisma(user));

    return {
        data: usersWithoutPassword,
        meta: {
            total,
            limit,
            offset,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
        }
    };
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findFirst({
        where: {
            id,
            deletedAt: null
        },
    });

    if(!user) {
        throw new NotFoundException('Usuário não encontrado');
    }

    return UserEntity.fromPrisma(user);
  }

  async findByEmail(email: string){
    return this.prisma.user.findUnique({
        where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    //1. Verifica se o usuário existe
    await this.findOne(id)

    //2. Se está atualizando o email, verifica se já existe
    if(updateUserDto.email){
        const existingUser = await this.prisma.user.findFirst({
            where: {
                email: updateUserDto.email,
                id: {not: id},
            },
        });

        if(existingUser){
            throw new ConflictException('Email já está em uso');
        }
    }

    //3. Se está atualizando a senha, faz o hash
    let dataToUpdate = { ...updateUserDto };
    if(updateUserDto.password){
        const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
        dataToUpdate = { ...dataToUpdate, password: hashedPassword };
    }

    // Atualiza o usuário
    const user = await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
    });

    return UserEntity.fromPrisma(user);
  }

  async remove(id: string): Promise<void> {
    //1. Verifica se o usuário existe
    await this.findOne(id)

    //2. Soft delete - apenas marca a data de deleção
    await this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
    });
  }
}