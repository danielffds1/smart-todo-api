import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Weather')
@ApiBearerAuth()
@Controller('weather')
@UseGuards(JwtAuthGuard)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}


  //Busca o clima atual de uma cidade
  @Get('current')
  @ApiOperation({ summary: 'Busca o clima atual de uma cidade' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Clima atual da cidade' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Parâmetro "city" é obrigatório' })
  @ApiQuery({ name: 'city', type: String, required: true, description: 'Nome da cidade' })
  getCurrentWeather(@Query('city') city: string) {
    if (!city) {
      throw new Error('Parâmetro "city" é obrigatório');
    }
    return this.weatherService.getCurrentWeather(city);
  }

  //Busca a previsão do tempo para os próximos 5 dias
  @Get('forecast')
  @ApiOperation({ summary: 'Busca a previsão do tempo para os próximos 5 dias' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Previsão do tempo para os próximos 5 dias' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Parâmetro "city" é obrigatório' })
  @ApiQuery({ name: 'city', type: String, required: true, description: 'Nome da cidade' })
  getForecast(@Query('city') city: string) {
    if (!city) {
      throw new Error('Parâmetro "city" é obrigatório');
    }
    return this.weatherService.getForecast(city);
  }

  //Sugerir o melhor horário para realizar uma tarefa baseado no clima
  @Get('best-time')
  @ApiOperation({ summary: 'Sugerir o melhor horário para realizar uma tarefa baseado no clima' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Melhor horário para realizar a tarefa' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Parâmetro "city" é obrigatório' })
  @ApiQuery({ name: 'city', type: String, required: true, description: 'Nome da cidade' })
  @ApiQuery({ name: 'category', type: String, required: false, description: 'Categoria da tarefa' })
  getBestTime(
    @Query('city') city: string,
    @Query('category') category?: string,
  ) {
    if (!city) {
      throw new Error('Parâmetro "city" é obrigatório');
    }
    return this.weatherService.getBestTime(city, category);
  }
}
