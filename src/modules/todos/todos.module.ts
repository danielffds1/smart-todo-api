import { Module } from '@nestjs/common';
import { TodosService } from './todos.service';
import { TodosController } from './todos.controller';
import { WeatherModule } from 'src/integration/weather/weather.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [WeatherModule, AIModule],
  controllers: [TodosController],
  providers: [TodosService],
  exports: [TodosService],
})
export class TodosModule {}