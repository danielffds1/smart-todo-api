//src/modules/ai/ai.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiRequestConfig, GeminiResponse } from './interfaces/gemini.interface';
import {
  GenerateDescriptionResponseDto,
  SuggestCategoryResponseDto,
  ProductivityAnalysisDto,
  OptimizeSuggestionsDto,
} from './dto/ai-response.dto';
import { TodoStatus, TodoPriority } from '@prisma/client';

@Injectable()
export class AIService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('gemini.apiKey');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada no .env');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    const model = this.configService.get<string>('gemini.model');
    if (!model) {
      throw new Error('GEMINI_MODEL não configurada no .env');
    }
    this.model = model;
   
    const maxTokens = this.configService.get<number>('gemini.maxTokens') ?? 1000;
    this.maxTokens = maxTokens;
  }

  //Método genérico para chamar a API Gemini
  private async callGemini(config: GeminiRequestConfig): Promise<GeminiResponse> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        systemInstruction: config.systemInstruction ||
          'Você é um assistente inteligente para gerenciamento de tarefas.',
      });

      const generationConfig = {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? this.maxTokens,
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: config.prompt }] }],
        generationConfig,
      });

      const response = result.response;
      const text = response.text();

      // Gemini não retorna token count da mesma forma, estimamos
      const estimatedTokens = Math.ceil(text.length / 4);

      return {
        content: text.trim(),
        tokens_used: estimatedTokens,
        model: this.model,
      };
    } catch (error) {
      console.error('Erro ao chamar Gemini:', error);
      throw new InternalServerErrorException('Erro ao processar requisição com IA');
    }
  }

  //Gera uma descrição inteligente para uma tarefa baseada no título
  async generateDescription(title: string): Promise<GenerateDescriptionResponseDto> {
    const prompt = `
        Baseado no título da tarefa "${title}", gere uma descrição para a tarefa, prática e objetiva.
        A descrição deve:
        - Ter entre 10-100 caracteres
        - Ser clara e acionável
        - Incluir passos ou objetivos se aplicável
        - Estar em português do Brasil

        Retorne APENAS a descrição, sem aspas ou formatação adicional.
    `.trim();

    const systemInstruction = `
        Você é um assistente especializado em produtividade e gerenciamento de tarefas.
        Sua função é gerar descrições úteis e práticas para tarefas.
    `.trim();

    const response = await this.callGemini({
      prompt,
      systemInstruction,
      temperature: 0.7,
    });

    return new GenerateDescriptionResponseDto({
      title,
      generated_description: response.content,
      tokens_used: response.tokens_used,
    });
  }

  //Sugere uma categoria para a tarefa baseada no título e descrição
  async suggestCategory(title: string, description?: string): Promise<SuggestCategoryResponseDto> {
    const taskInfo = description ? `${title} - ${description}` : title;

    const prompt = `
        Analise a seguinte tarefa: "${taskInfo}"

        Categorias disponíveis: trabalho, estudos, saude, exercicio, compras, financas, casa, lazer, pessoal, outros

        Retorne no formato JSON:
        {
        "category": "categoria_sugerida",
        "confidence": "high|medium|low",
        "alternatives": ["alternativa1", "alternativa2"]
        }

        Retorne APENAS o JSON válido, sem markdown, sem texto adicional.
    `.trim();

    const systemInstruction = `
        Você é um especialista em categorização de tarefas.
        Analise o contexto e sugira a categoria mais apropriada.
        Sempre retorne JSON válido.
    `.trim();

    const response = await this.callGemini({
      prompt,
      systemInstruction,
      temperature: 0.3,
    });

    try {
      // Remove possíveis markdown code blocks
      let cleanJson = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const parsed = JSON.parse(cleanJson);

      return new SuggestCategoryResponseDto({
        title,
        description,
        suggested_category: parsed.category,
        confidence: parsed.confidence,
        alternative_categories: parsed.alternatives || [],
        tokens_used: response.tokens_used,
      });
    } catch (error) {
      // Fallback se o JSON vier malformado
      return new SuggestCategoryResponseDto({
        title,
        description,
        suggested_category: 'outros',
        confidence: 'low',
        alternative_categories: [],
        tokens_used: response.tokens_used,
      });
    }
  }

  //Analisa a produtividade do usuário nos últimos N dias
  async analyzeProductivity(userId: string, days: number = 7): Promise<ProductivityAnalysisDto> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Busca tarefas do período
    const tasks = await this.prisma.todo.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcula métricas
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === TodoStatus.COMPLETED).length;
    const pending = tasks.filter((t) => t.status === TodoStatus.PENDING).length;
    const inProgress = tasks.filter((t) => t.status === TodoStatus.IN_PROGRESS).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Agrupa por categoria
    const categoryCounts = tasks.reduce((acc, task) => {
      const cat = task.category || 'sem_categoria';
      if (!acc[cat]) acc[cat] = { total: 0, completed: 0 };
      acc[cat].total++;
      if (task.status === TodoStatus.COMPLETED) acc[cat].completed++;
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);

    // Encontra categoria mais/menos produtiva
    let mostProductive: string | null = null;
    let leastProductive: string | null = null;
    let maxRate = -1;
    let minRate = 101;

    Object.entries(categoryCounts).forEach(([cat, counts]) => {
      const rate = (counts.completed / counts.total) * 100;
      if (rate > maxRate) {
        maxRate = rate;
        mostProductive = cat;
      }
      if (rate < minRate && counts.total >= 2) {
        minRate = rate;
        leastProductive = cat;
      }
    });

    // Determina tendência
    const trend = completionRate >= 70 ? 'increasing' : completionRate >= 40 ? 'stable' : 'decreasing';

    // Prompt para IA analisar
    const prompt = `
        Analise os seguintes dados de produtividade:

        Período: ${days} dias
        Total de tarefas: ${total}
        Tarefas concluídas: ${completed}
        Tarefas pendentes: ${pending}
        Tarefas em progresso: ${inProgress}
        Taxa de conclusão: ${completionRate}%
        Categoria mais produtiva: ${mostProductive || 'N/A'}
        Categoria menos produtiva: ${leastProductive || 'N/A'}
        Tendência: ${trend}

        Forneça:
        1. Uma análise breve (máx 100 palavras) sobre a produtividade
        2. 3 recomendações práticas para melhorar

        Retorne no formato JSON:
        {
        "analysis": "texto da análise",
        "recommendations": ["recomendação1", "recomendação2", "recomendação3"]
        }

        Retorne APENAS o JSON válido, sem markdown.
    `.trim();

    const systemInstruction = `
        Você é um coach de produtividade.
        Analise os dados e forneça insights construtivos e motivadores.
        Sempre retorne JSON válido.
    `.trim();


    const response = await this.callGemini({
      prompt,
      systemInstruction,
      temperature: 0.7,
    });

    let aiAnalysis = 'Análise não disponível';
    let recommendations = ['Continue se esforçando!'];

    try {
      let cleanJson = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const parsed = JSON.parse(cleanJson);
      aiAnalysis = parsed.analysis;
      recommendations = parsed.recommendations;
    } catch (error) {
      console.error('Erro ao analisar produtividade:', error);
    }

    return new ProductivityAnalysisDto({
      period: {
        days,
        start_date: startDate,
        end_date: endDate,
      },
      summary: {
        total_tasks: total,
        completed_tasks: completed,
        pending_tasks: pending,
        in_progress_tasks: inProgress,
        completion_rate: completionRate,
      },
      insights: {
        most_productive_category: mostProductive ?? undefined,
        least_productive_category: leastProductive ?? undefined,
        productivity_trend: trend,
      },
      ai_analysis: aiAnalysis,
      recommendations,
      tokens_used: response.tokens_used,
    });
  }

  //Sugere otimizações para as tarefas pendentes do usuáriO
  async optimizeTasks(userId: string): Promise<OptimizeSuggestionsDto> {
    const tasks = await this.prisma.todo.findMany({
      where: {
        userId,
        status: { in: [TodoStatus.PENDING, TodoStatus.IN_PROGRESS] },
        deletedAt: null,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    if (tasks.length === 0) {
      return new OptimizeSuggestionsDto({
        total_tasks_analyzed: 0,
        suggestions: [],
        general_recommendations: ['Você não tem tarefas pendentes. Ótimo trabalho!'],
        tokens_used: 0,
      });
    }

    const tasksList = tasks
      .map((t, i) => `${i + 1}. "${t.title}" - Prioridade: ${t.priority}, Categoria: ${t.category || 'N/A'}`)
      .join('\n');

    const prompt = `
        Analise as seguintes tarefas pendentes e sugira otimizações para cada uma delas:

        ${tasksList}

        Para cada tarefa, avalie se a prioridade e categoria estão adequadas.
        Também forneça 3 recomendações gerais de organização.

        Retorne no formato JSON:
        {
        "task_suggestions": [
            {
            "task_number": 1,
            "suggested_priority": "HIGH|MEDIUM|LOW ou null se adequada",
            "suggested_category": "categoria ou null se adequada",
            "reason": "motivo da sugestão"
            }
        ],
        "general_recommendations": ["rec1", "rec2", "rec3"]
        }

        Retorne APENAS o JSON válido, sem markdown.
    `.trim();


    const systemInstruction = `
        Você é um especialista em gestão de tempo e priorização.
        Ajude o usuário a organizar melhor suas tarefas.
        Sempre retorne JSON válido.
    `.trim();

    const response = await this.callGemini({
      prompt,
      systemInstruction,
      temperature: 0.5,
      maxTokens: 800,
    });

    interface TaskSuggestion {
        task_number: number;
        suggested_priority?: string | null;
        suggested_category?: string | null;
        reason?: string;
    }

    let taskSuggestions: TaskSuggestion[] = [];
    let generalRecs = ['Mantenha o foco!'];

    try {
      let cleanJson = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const parsed = JSON.parse(cleanJson);
      taskSuggestions = parsed.task_suggestions || [];
      generalRecs = parsed.general_recommendations || [];
    } catch (error) {
      console.error('Erro ao sugerir otimizações:', error);
      taskSuggestions = [];
      generalRecs = ['Continue se esforçando!'];
    }

    const suggestions = tasks.map((task, index) => {
        const aiSuggestion = taskSuggestions.find((s) => s.task_number === index + 1);
 
        return {
          task_id: task.id,
          task_title: task.title,
          current_priority: task.priority,
          current_category: task.category ?? undefined,
          suggestions: {
            suggested_priority: aiSuggestion?.suggested_priority ?? undefined,
            suggested_category: aiSuggestion?.suggested_category ?? undefined,
            reason: aiSuggestion?.reason || 'Configuração atual parece adequada',
          },
        };
      });

    return new OptimizeSuggestionsDto({
      total_tasks_analyzed: tasks.length,
      suggestions,
      general_recommendations: generalRecs,
      tokens_used: response.tokens_used,
    });
  }
}
