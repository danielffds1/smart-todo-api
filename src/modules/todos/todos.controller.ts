import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
    BadRequestException,
  } from '@nestjs/common';
  import { TodosService } from './todos.service';
  import { CreateTodoDto } from './dto/create-todo.dto';
  import { UpdateTodoDto } from './dto/update-todo.dto';
  import { UpdateStatusDto } from './dto/update-status.dto';
  import { QueryTodoDto } from './dto/query-todo.dto';
  import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
  import { GetUser } from '../../common/decorators/get-user.decorator';
  import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
  import { WeatherService } from '../../integration/weather/weather.service';
 
  @ApiTags('Todos')
  @ApiBearerAuth()
  @Controller('todos')
  @UseGuards(JwtAuthGuard)
  export class TodosController {
    constructor(
      private readonly todosService: TodosService, 
      private readonly weatherService: WeatherService,
    ) {}
 
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(
      @GetUser('id') userId: string,
      @Body() createTodoDto: CreateTodoDto,
    ) {
      return this.todosService.create(userId, createTodoDto);
    }
 
    @Get()
    findAll(
      @GetUser('id') userId: string,
      @Query() query: QueryTodoDto,
    ) {
      return this.todosService.findAll(userId, query);
    }
 
    @Get(':id')
    findOne(
      @GetUser('id') userId: string,
      @Param('id') id: string,
    ) {
      return this.todosService.findOne(userId, id);
    }
 
    @Patch(':id')
    update(
      @GetUser('id') userId: string,
      @Param('id') id: string,
      @Body() updateTodoDto: UpdateTodoDto,
    ) {
      return this.todosService.update(userId, id, updateTodoDto);
    }
 
    @Patch(':id/status')
    updateStatus(
      @GetUser('id') userId: string,
      @Param('id') id: string,
      @Body() updateStatusDto: UpdateStatusDto,
    ) {
      return this.todosService.updateStatus(userId, id, updateStatusDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(
      @GetUser('id') userId: string,
      @Param('id') id: string,
    ) {
      return this.todosService.remove(userId, id);
    }

    @Get(':id/weather')
    async getTodoWeather(
      @GetUser('id') userId: string,
      @Param('id') id: string,
    ) {
      // Busca a tarefa
      const todo = await this.todosService.findOne(userId, id);

      if (!todo.city) {
        throw new BadRequestException('Esta tarefa não possui cidade configurada');
      }
      // Busca clima atual
      const weather = await this.weatherService.getCurrentWeather(todo.city);
      return {
        todo: {
          id: todo.id,
          title: todo.title,
          city: todo.city,
        },
        weather,
      };
    }

    @Get(':id/best-time')
    async getTodoBestTime(
      @GetUser('id') userId: string,
      @Param('id') id: string,
    ) {
      const todo = await this.todosService.findOne(userId, id);

      if (!todo.city) {
        throw new BadRequestException('Esta tarefa não possui cidade configurada');
      }
  
      const bestTime = await this.weatherService.getBestTime(todo.city, todo.category ?? undefined);
  
      return {
        todo: {
          id: todo.id,
          title: todo.title,
          category: todo.category,
          city: todo.city,
        },
        recommendation: bestTime,
      };
    }
}
