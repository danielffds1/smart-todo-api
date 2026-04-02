//src/modules/ai/dto/weather-suggestions.dto.ts
import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WeatherSuggestionsDto {
  @ApiProperty({
    example: 'uuid-da-tarefa',
    description: 'ID da tarefa para analisar',
  })
  @IsNotEmpty({ message: 'O ID da tarefa é obrigatório' })
  @IsString({ message: 'O ID deve ser um texto' })
  taskId: string;
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
    type: string; // 'indoor' | 'outdoor' | 'postpone' | 'home'
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