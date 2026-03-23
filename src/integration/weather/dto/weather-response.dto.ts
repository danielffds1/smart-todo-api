// Clima atual
export class CurrentWeatherDto {
    city: string;
    country: string;
    temperature: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
    description: string;
    icon: string;
    wind_speed: number;
    clouds: number;
    sunrise: Date;
    sunset: Date;
    timestamp: Date;
 
    constructor(partial: Partial<CurrentWeatherDto>) {
      Object.assign(this, partial);
    }
  }
 
  // Previsão para um horário específico
  export class ForecastItemDto {
    datetime: Date;
    datetime_text: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    description: string;
    icon: string;
    wind_speed: number;
    clouds: number;
    rain_probability: number;
    period: 'day' | 'night';
 
    constructor(partial: Partial<ForecastItemDto>) {
      Object.assign(this, partial);
    }
  }
 
  // Previsão completa
  export class WeatherForecastDto {
    city: string;
    country: string;
    forecast: ForecastItemDto[];
    total_forecasts: number;
 
    constructor(partial: Partial<WeatherForecastDto>) {
      Object.assign(this, partial);
    }
  }
 
  // Sugestão de melhor horário
  export class BestTimeDto {
    recommended_time: Date;
    recommended_time_text: string;
    score: number;
    temperature: number;
    description: string;
    reason: string;
    alternatives: Array<{
      time: Date;
      time_text: string;
      score: number;
      temperature: number;
      description: string;
    }>;
 
    constructor(partial: Partial<BestTimeDto>) {
      Object.assign(this, partial);
    }
  }
