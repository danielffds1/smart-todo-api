import { PrismaService } from "./prisma.service";
import { Global, Module } from "@nestjs/common";

@Global() // Torna o módulo global para ficar fácil de usar em outros módulos
@Module({ 
    providers: [PrismaService],
    exports: [PrismaService],
}) 
export class PrismaModule {} 