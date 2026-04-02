import { forwardRef, Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { TodosModule } from '../todos/todos.module';
import { WeatherModule } from 'src/integration/weather/weather.module';

@Module({
  imports: [
    WeatherModule,
    forwardRef(() => TodosModule),
  ],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}