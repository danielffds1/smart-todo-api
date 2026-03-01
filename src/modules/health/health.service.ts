import { PrismaService } from "src/common/prisma/prisma.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
    constructor(private readonly prisma: PrismaService) {}

    check(){
        return {
            status: 'ok',
            message: 'SmartTodo API is running',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
        };
    }

    async checkDatabase(){
        try {
            // Tenta executar uma query simples para verificar a conexão com o banco de dados
            await this.prisma.$queryRaw`SELECT 1`;
   
            return {
                status: 'ok',
                message: 'Database connection is healthy',
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Database connection failed',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }
    }
}