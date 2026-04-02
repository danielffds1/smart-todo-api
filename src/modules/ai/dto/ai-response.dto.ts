//Resposta de geração de descrição
export class GenerateDescriptionResponseDto {
    title: string;
    generated_description: string;
    tokens_used: number;
 
    constructor(partial: Partial<GenerateDescriptionResponseDto>) {
      Object.assign(this, partial);
    }
  }
 
  //Resposta de sugestão de categoria
  export class SuggestCategoryResponseDto {
    title: string;
    description?: string;
    suggested_category: string;
    confidence: 'high' | 'medium' | 'low';
    alternative_categories: string[];
    tokens_used: number;
 
    constructor(partial: Partial<SuggestCategoryResponseDto>) {
      Object.assign(this, partial);
    }
  }
 
  //Resposta de análise de produtividade
  export class ProductivityAnalysisDto {
    period: {
      days: number;
      start_date: Date;
      end_date: Date;
    };
    summary: {
      total_tasks: number;
      completed_tasks: number;
      pending_tasks: number;
      in_progress_tasks: number;
      completion_rate: number;
    };
    insights: {
      most_productive_category?: string;
      least_productive_category?: string;
      average_completion_time?: string;
      productivity_trend: 'increasing' | 'stable' | 'decreasing';
    };
    ai_analysis: string;
    recommendations: string[];
    tokens_used: number;
 
    constructor(partial: Partial<ProductivityAnalysisDto>) {
      Object.assign(this, partial);
    }
  }
 
  //Resposta de otimização de tarefas 
  export class OptimizeSuggestionsDto {
    total_tasks_analyzed: number;
    suggestions: Array<{
      task_id: string;
      task_title: string;
      current_priority: string;
      current_category?: string;
      suggestions: {
        suggested_priority?: string;
        suggested_category?: string;
        reason: string;
      };
    }>;
    general_recommendations: string[];
    tokens_used: number;
 
    constructor(partial: Partial<OptimizeSuggestionsDto>) {
      Object.assign(this, partial);
    }
  }

  export class WeatherSuggestionsResponseDto {
    task: {
      id: string;
      title: string;
      description?: string;
      category?: string;
      city?: string;
    };
    
    weather: {
      city: string;
      temperature: number;
      description: string;
      is_raining: boolean;
      is_good_for_outdoor: boolean;
      conditions_summary: string;
    };
  
    ai_analysis: {
      can_proceed_original: boolean;
      reason: string;
      recommendations: string[];
    };
  
    alternative_suggestions: Array<{
      type: string;
      title: string;
      description: string;
      specific_places?: string[];
      why_suggested: string;
    }>;
  
    final_recommendation: string;
    tokens_used: number;
  
    constructor(partial: Partial<WeatherSuggestionsResponseDto>) {
      Object.assign(this, partial);
    }
  }
