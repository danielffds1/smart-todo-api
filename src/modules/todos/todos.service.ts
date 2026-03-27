import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryTodoDto } from './dto/query-todo.dto';
import { TodoEntity } from './entities/todo.entity';
import { TodoStatus } from '@prisma/client';
import { WeatherService } from 'src/integration/weather/weather.service';

@Injectable()
export class TodosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
  ) {}

  async create(userId: string, createTodoDto: CreateTodoDto): Promise<TodoEntity> {
    if (createTodoDto.status && createTodoDto.status !== TodoStatus.PENDING) {
      throw new BadRequestException('Uma nova tarefa só pode ser criada com status PENDING');
    }
    
    const todo = await this.prisma.todo.create({
      data: {
        ...createTodoDto,
        status: TodoStatus.PENDING,
        userId,

        startDate: createTodoDto.startDate
          ? new Date(createTodoDto.startDate)
          : undefined,
        endDate: createTodoDto.endDate
          ? new Date(createTodoDto.endDate)
          : undefined,
      },
    });
    return TodoEntity.fromPrisma(todo);
  }

  async findAll(userId: string, query: QueryTodoDto) {
    const { status, priority, category, city, search, sort, order } = query;

    const limit = query.limit ?? 10;
    const offset = query.offset ?? 0;
 
    // Monta o objeto where para filtros
    const where: any = {
      userId,
      deletedAt: null,
    };

    // Filtros opcionais
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (city) where.city = city;

    // Busca textual (title OU description)
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortField = sort ?? 'createdAt';
    const orderDir = order ?? 'desc';

    const [todos, total] = await Promise.all([
      this.prisma.todo.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortField]: orderDir },
      }),
      this.prisma.todo.count({ where }),
    ]);

    const todosEntities = todos.map((todo) => TodoEntity.fromPrisma(todo));

    return {
      data: todosEntities,
      meta: {
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string): Promise<TodoEntity> {
    const todo = await this.prisma.todo.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!todo) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    return TodoEntity.fromPrisma(todo);
  }

  async update(userId: string, id: string, updateTodoDto: UpdateTodoDto): Promise<TodoEntity> {
    // Verifica se a tarefa existe e pertence ao usuário
    await this.findOne(userId, id);

    const todo = await this.prisma.todo.update({
      where: { id },
      data: updateTodoDto,
    });

    return TodoEntity.fromPrisma(todo);
  }

  async updateStatus(userId: string, id: string, updateStatusDto: UpdateStatusDto): Promise<TodoEntity> {
    // Verifica se a tarefa existe e pertence ao usuário
    await this.findOne(userId, id);

    const todo = await this.prisma.todo.update({
      where: { id },
      data: { status: updateStatusDto.status },
    });

    return TodoEntity.fromPrisma(todo);
  }

  async remove(userId: string, id: string): Promise<void> {
    // Verifica se a tarefa existe e pertence ao usuário
    await this.findOne(userId, id);


    await this.prisma.todo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async validateOwnership(userId: string, todoId: string): Promise<void> {
    const todo = await this.prisma.todo.findUnique({
      where: { id: todoId },
      select: { userId: true },
    });

    if (!todo) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    if (todo.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta tarefa');
    }
  }

  async getTodoWeather(userId: string, id: string){
    const todo =await this.findOne(userId, id);

    if(!todo.city){
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

  async getTodoBestTime(userId: string, id: string){
    // Busca a tarefa
    const todo = await this.findOne(userId, id);

    if(!todo.city){
      throw new BadRequestException('Esta tarefa não possui cidade configurada');
    }

    // Busca o melhor horário para realizar a tarefa
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
