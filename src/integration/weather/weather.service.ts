import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  OpenWeatherResponse,
  OpenWeatherForecastResponse,
} from './interfaces/openweather.interface';
import {
  CurrentWeatherDto,
  WeatherForecastDto,
  ForecastItemDto,
  BestTimeDto,
} from './dto/weather-response.dto';


@Injectable()
export class WeatherService {
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('openweather.apiKey');
    if (!apiKey) {
      throw new Error('OPENWEATHER_API_KEY não configurada no .env');
    }
    this.apiKey = apiKey;

    const baseUrl = this.configService.get<string>('openweather.baseUrl') ?? 'https://api.openweathermap.org/data/2.5';

    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
    });
  }


  //Busca o clima atual de uma cidade
  async getCurrentWeather(city: string): Promise<CurrentWeatherDto> {
    try {
      const response = await this.axiosInstance.get<OpenWeatherResponse>('/weather', {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric',
          lang: 'pt_br',
        },
      });

      const data = response.data;

      return new CurrentWeatherDto({
        city: data.name,
        country: data.sys.country,
        temperature: Math.round(data.main.temp),
        feels_like: Math.round(data.main.feels_like),
        temp_min: Math.round(data.main.temp_min),
        temp_max: Math.round(data.main.temp_max),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        wind_speed: data.wind.speed,
        clouds: data.clouds.all,
        sunrise: new Date(data.sys.sunrise * 1000),
        sunset: new Date(data.sys.sunset * 1000),
        timestamp: new Date(data.dt * 1000),
      });
    } catch (error) {
      if (error.response?.status === 404) {
        throw new BadRequestException(`Cidade "${city}" não encontrada`);
      }
      throw new InternalServerErrorException('Erro ao buscar dados do clima');
    }
  }

  //Busca previsão do tempo para os próximos 5 dias (intervalos de 3h)
  async getForecast(city: string): Promise<WeatherForecastDto> {
    try {
      const response = await this.axiosInstance.get<OpenWeatherForecastResponse>('/forecast', {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric',
          lang: 'pt_br',
        },
      });

      const data = response.data;

      //Mapear os dados da previsão do tempo para o ForecastItemDto
      const forecast = data.list.map(
        (item) =>
          new ForecastItemDto({
            datetime: new Date(item.dt * 1000),
            datetime_text: item.dt_txt,
            temperature: Math.round(item.main.temp),
            feels_like: Math.round(item.main.feels_like),
            humidity: item.main.humidity,
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            wind_speed: item.wind.speed,
            clouds: item.clouds.all,
            rain_probability: Math.round(item.pop * 100),
            period: item.sys.pod === 'd' ? 'day' : 'night',
          }),
      );

      return new WeatherForecastDto({
        city: data.city.name,
        country: data.city.country,
        forecast,
        total_forecasts: forecast.length,
      });
    } catch (error) {
      if (error.response?.status === 404) {
        throw new BadRequestException(`Cidade "${city}" não encontrada`);
      }
      throw new InternalServerErrorException('Erro ao buscar previsão do tempo');
    }
  }

  //Sugerir o melhor horário para realizar uma tarefa baseado no clima
  async getBestTime(city: string, taskCategory?: string): Promise<BestTimeDto> {
    const forecast = await this.getForecast(city);

    const now = new Date();
    const futureForecasts = forecast.forecast.filter((f) => {
      const hoursDiff = (f.datetime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 0 && hoursDiff <= 48;
    });


    if (futureForecasts.length === 0) {
      throw new BadRequestException('Nenhuma previsão disponível para os próximos 2 dias');
    }

    const scoredForecasts = futureForecasts.map((f) => {
      let score = 100;

      if (f.temperature < 18) {
        score -= (18 - f.temperature) * 2;
      } else if (f.temperature > 25) {
        score -= (f.temperature - 25) * 2;
      }

      score -= f.rain_probability;

      score -= f.clouds * 0.2;

      if (f.wind_speed > 10) {
        score -= (f.wind_speed - 10) * 2;
      }

      // Preferência por período diurno (dependendo da categoria)
      if (taskCategory === 'exercicio' || taskCategory === 'saude') {
        if (f.period === 'day') {
          score += 10;
        }
      }

      score = Math.max(0, Math.min(100, score));

      return { ...f, score: Math.round(score) };
    });

    // Ordena por score (maior primeiro)
    scoredForecasts.sort((a, b) => b.score - a.score);

    const best = scoredForecasts[0];
    const alternatives = scoredForecasts.slice(1, 4);

    // Gera motivo baseado nas condições
    let reason = 'Condições climáticas favoráveis';
    if (best.rain_probability > 50) {
      reason = 'Possibilidade de chuva, mas melhor opção disponível';
    } else if (best.temperature >= 18 && best.temperature <= 25) {
      reason = 'Temperatura agradável e baixa probabilidade de chuva';
    } else if (best.temperature < 18) {
      reason = 'Temperatura mais amena dentre as opções';
    } else if (best.temperature > 25) {
      reason = 'Dia mais quente, mas sem chuva';
    }

    return new BestTimeDto({
      recommended_time: best.datetime,
      recommended_time_text: best.datetime_text,
      score: best.score,
      temperature: best.temperature,
      description: best.description,
      reason,
      alternatives: alternatives.map((a) => ({
        time: a.datetime,
        time_text: a.datetime_text,
        score: a.score,
        temperature: a.temperature,
        description: a.description,
      })),
    });
  }
}
