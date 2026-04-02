import { Controller, Post, Get, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import { SuggestCategoryDto } from './dto/suggest-category.dto';
import { AnalyzeProductivityDto } from './dto/analyze-productivity.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('generate-description')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Gera uma descrição para um título' })
  @ApiBody({ type: GenerateDescriptionDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Descrição gerada com sucesso' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  generateDescription(@Body() dto: GenerateDescriptionDto) {
    return this.aiService.generateDescription(dto.title);
  }

  @Post('suggest-category')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sugere uma categoria para um título' })
  @ApiBody({ type: SuggestCategoryDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Categoria sugerida com sucesso' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  suggestCategory(@Body() dto: SuggestCategoryDto) {
    return this.aiService.suggestCategory(dto.title, dto.description);
  }

  @Get('analyze-productivity')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Analisa a produtividade de um usuário' })
  @ApiQuery({ type: AnalyzeProductivityDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Produtividade analisada com sucesso' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  analyzeProductivity(
    @GetUser('id') userId: string,
    @Query() query: AnalyzeProductivityDto,
  ) {
    return this.aiService.analyzeProductivity(userId, query.days);
  }

  @Get('optimize-tasks')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Otimiza as tarefas de um usuário' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tarefas otimizadas com sucesso' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  optimizeTasks(@GetUser('id') userId: string) {
    return this.aiService.optimizeTasks(userId);
  }
}
