import { User as PrismaUser } from '@prisma/client';

export class UserEntity implements Omit<PrismaUser, 'password'> {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;

    constructor(partial: Partial<UserEntity>) {
        Object.assign(this, partial);
    }

  static fromPrisma(user: PrismaUser): UserEntity {
    const { password, ...userWithoutPassword } = user;
    return new UserEntity(userWithoutPassword);
  }
}