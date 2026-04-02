import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
import { WeatherSuggestionsResponseDto } from './dto/weather-suggestions.dto';
import { WeatherService } from 'src/integration/weather/weather.service';
import { TodosService } from '../todos/todos.service';

@Injectable()
export class AIService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TodosService)) private readonly todosService: TodosService,
    private readonly weatherService: WeatherService,
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
      maxTokens: 4096,
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

  //Sugere alternativas baseadas no clima da cidade
  async suggestBasedOnWeather(
    userId: string,
    taskId: string,
    weatherData: any,
  ): Promise<WeatherSuggestionsResponseDto> {
    // Busca a tarefa
    const task = await this.prisma.todo.findFirst({
      where: {
        id: taskId,
        userId,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    if (!task.city) {
      throw new NotFoundException('Esta tarefa não possui cidade configurada');
    }

    // Analisa condições climáticas
    const isRaining = weatherData.description.toLowerCase().includes('chuva') ||
                      weatherData.description.toLowerCase().includes('rain') ||
                      (weatherData.rain_probability && weatherData.rain_probability > 50);

    const temperature = weatherData.temperature;
    const isTooHot = temperature > 35;
    const isTooCold = temperature < 10;
    const isGoodForOutdoor = !isRaining && !isTooHot && !isTooCold && weatherData.wind_speed < 15;

    // Determina categoria da atividade
    const isOutdoorActivity = 
      task.category === 'exercicio' || 
      task.category === 'saude' ||
      task.title.toLowerCase().includes('caminhada') ||
      task.title.toLowerCase().includes('corrida') ||
      task.title.toLowerCase().includes('parque') ||
      task.title.toLowerCase().includes('ao ar livre') ||
      task.title.toLowerCase().includes('outdoor');

    const conditionsSummary = this.generateConditionsSummary(weatherData, isRaining, isTooHot, isTooCold);

    // Prompt para IA analisar
    const prompt = `
      Analise a seguinte situação e sugira alternativas inteligentes:

      TAREFA DO USUÁRIO:
      - Título: "${task.title}"
      - Descrição: "${task.description || 'Não informada'}"
      - Categoria: "${task.category || 'Não categorizada'}"
      - Cidade: "${task.city}"

      CONDIÇÕES CLIMÁTICAS ATUAIS EM ${task.city.toUpperCase()}:
      - Temperatura: ${temperature}°C
      - Condição: ${weatherData.description}
      - Está chovendo: ${isRaining ? 'SIM' : 'NÃO'}
      - Probabilidade de chuva: ${weatherData.rain_probability || 0}%
      - Vento: ${weatherData.wind_speed} m/s
      - Nuvens: ${weatherData.clouds}%
      ${weatherData.feels_like ? `- Sensação térmica: ${weatherData.feels_like}°C` : ''}

      ANÁLISE NECESSÁRIA:
      1. A pessoa pode fazer a atividade planejada nas condições atuais?
      2. Se NÃO for recomendado, sugira 4-5 alternativas adequadas para o clima
      3. Considere que é uma atividade ${isOutdoorActivity ? 'ao ar livre' : 'que pode ser indoor'}

      Para cada alternativa, considere:
      - Atividades indoor se estiver chovendo ou clima extremo
      - Locais específicos da cidade ${task.city} (museus, shoppings, cinemas, cafés, etc)
      - Opções de "ficar em casa" se o clima estiver muito ruim
      - Atividades alternativas que mantenham o objetivo original quando possível

      Retorne no formato JSON:
      {
        "can_proceed_original": true/false,
        "reason": "Explicação clara sobre o clima e viabilidade",
        "recommendations": ["dica 1", "dica 2", "dica 3"],
        "alternative_suggestions": [
          {
            "type": "indoor|outdoor|postpone|home",
            "title": "Nome curto da alternativa",
            "description": "Descrição detalhada da sugestão",
            "specific_places": ["Local 1 em ${task.city}", "Local 2 em ${task.city}"],
            "why_suggested": "Por que essa alternativa é boa agora"
          }
        ],
        "final_recommendation": "Recomendação final resumida"
      }

      IMPORTANTE:
      - Seja específico sobre locais reais em ${task.city}
      - Se estiver chovendo, NÃO sugira atividades ao ar livre
      - Se temperatura estiver extrema, considere conforto térmico
      - Seja criativo mas prático
      - Mantenha o espírito da atividade original quando possível

      Retorne APENAS o JSON válido, sem markdown.
    `.trim();

    const systemInstruction = `
      Você é um assistente especializado em sugestões de atividades baseadas no clima.
      Você conhece bem cidades brasileiras e sabe sugerir locais específicos.
      Suas sugestões são práticas, consideradas e levam em conta segurança e conforto.
      Sempre retorne JSON válido.
    `.trim();

    const response = await this.callGemini({
      prompt,
      systemInstruction,
      temperature: 0.8,
      maxTokens: 4096,
    });

    let aiData = {
      can_proceed_original: !isRaining && isGoodForOutdoor,
      reason: 'Análise não disponível',
      recommendations: ['Verifique o clima antes de sair'],
      alternative_suggestions: [],
      final_recommendation: 'Considere reagendar a atividade',
    };

    try {
      let cleanJson = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const parsed = JSON.parse(cleanJson);
      aiData = {
        can_proceed_original: parsed.can_proceed_original ?? aiData.can_proceed_original,
        reason: parsed.reason || aiData.reason,
        recommendations: parsed.recommendations || aiData.recommendations,
        alternative_suggestions: parsed.alternative_suggestions || [],
        final_recommendation: parsed.final_recommendation || aiData.final_recommendation,
      };
    } catch (error) {
      console.error('Erro ao parsear resposta da IA:', error);
    }

    return new WeatherSuggestionsResponseDto({
      task: {
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        category: task.category || undefined,
        city: task.city,
      },
      weather: {
        city: task.city,
        temperature,
        description: weatherData.description,
        is_raining: isRaining,
        is_good_for_outdoor: isGoodForOutdoor,
        conditions_summary: conditionsSummary,
      },
      ai_analysis: {
        can_proceed_original: aiData.can_proceed_original,
        reason: aiData.reason,
        recommendations: aiData.recommendations,
      },
      alternative_suggestions: aiData.alternative_suggestions,
      final_recommendation: aiData.final_recommendation,
      tokens_used: response.tokens_used,
    });
  }

  async getWeatherSuggestionsForTask(userId: string, taskId: string){
    // Busca a tarefa
    const task = await this.todosService.findOne(userId, taskId);

    if (!task.city) {
      throw new Error('Esta tarefa não possui cidade configurada');
    }

    
    // Busca clima atual da cidade
    const weather = await this.weatherService.getCurrentWeather(task.city);

    // Busca previsão para melhor análise
    const forecast = await this.weatherService.getForecast(task.city);

    // Prepara dados do clima para IA
    const weatherData = {
      temperature: weather.temperature,
      feels_like: weather.feels_like,
      description: weather.description,
      wind_speed: weather.wind_speed,
      clouds: weather.clouds,
      rain_probability: 0, // Clima atual não tem probabilidade
    };

        // Se tiver previsão, pega a próxima (próximas 3 horas)
        if (forecast.forecast && forecast.forecast.length > 0) {
          const nextForecast = forecast.forecast[0];
          weatherData.rain_probability = nextForecast.rain_probability;
        }
    
        // Chama IA para sugestões
        return this.suggestBasedOnWeather(userId, taskId, weatherData);
    
  }
  
  //Método auxiliar para gerar resumo das condições
  private generateConditionsSummary(
    weatherData: any,
    isRaining: boolean,
    isTooHot: boolean,
    isTooCold: boolean,
  ): string {
    const conditions: string[] = [];

    if (isRaining) conditions.push('🌧️ Chuva');
    if (isTooHot) conditions.push('🔥 Muito quente');
    if (isTooCold) conditions.push('🥶 Muito frio');
    if (weatherData.wind_speed > 15) conditions.push('💨 Vento forte');
    if (weatherData.clouds > 80) conditions.push('☁️ Muito nublado');

    if (conditions.length === 0) {
      return '✅ Condições favoráveis';
    }

    return conditions.join(', ');
  }

}
