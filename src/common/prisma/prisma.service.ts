import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(){
        super({
            log: ['error'],
        });
    }

    // Conecta ao banco de dados quando o módulo é inicializado
    async onModuleInit(){
        await this.$connect();
        console.log('Database connected successfully!')
    }

    // Desconecta do banco de dados quando o módulo é destruído
    async onModuleDestroy(){
        await this.$disconnect();
        console.log('Database disconnected successfully!')
    }
}