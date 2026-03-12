import { Todo as PrismaTodo, TodoPriority, TodoStatus } from '@prisma/client';

export class TodoEntity implements PrismaTodo {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  category: string | null;
  city: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  constructor(partial: Partial<TodoEntity>) {
    Object.assign(this, partial);
  }

  static fromPrisma(todo: PrismaTodo): TodoEntity {
    return new TodoEntity(todo);
  }
}