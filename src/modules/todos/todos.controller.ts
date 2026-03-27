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
  } from '@nestjs/common';
  import { TodosService } from './todos.service';
  import { CreateTodoDto } from './dto/create-todo.dto';
  import { UpdateTodoDto } from './dto/update-todo.dto';
  import { UpdateStatusDto } from './dto/update-status.dto';
  import { QueryTodoDto } from './dto/query-todo.dto';
  import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
  import { GetUser } from '../../common/decorators/get-user.decorator';
  import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
 
  @ApiTags('Todos')
  @ApiBearerAuth()
  @Controller('todos')
  @UseGuards(JwtAuthGuard)
  export class TodosController {
    constructor(
      private readonly todosService: TodosService, 
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
      return this.todosService.getTodoWeather(userId, id);
    }

    @Get(':id/best-time')
    async getTodoBestTime(
      @GetUser('id') userId: string,
      @Param('id') id: string,
    ) {
      return this.todosService.getTodoBestTime(userId, id);
    }
}
