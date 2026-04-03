import { TodoStatus, TodoPriority } from '@prisma/client';

export class DashboardStatsDto {
  period: {
    start: Date;
    end: Date;
    type: string;
  };

  overview: {
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    completion_rate: number;
    deleted_tasks: number;
  };

  by_priority: Array<{
    priority: TodoPriority;
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    completion_rate: number;
  }>;

  by_category: Array<{
    category: string;
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    completion_rate: number;
  }>;

  by_status: Array<{
    status: TodoStatus;
    count: number;
    percentage: number;
  }>;

  streak: {
    current_streak: number;
    longest_streak: number;
    last_completion_date: Date | null;
  };

  daily_average: {
    created: number;
    completed: number;
  };

  top_categories: Array<{
    category: string;
    completion_rate: number;
    total_tasks: number;
  }>;

  constructor(partial: Partial<DashboardStatsDto>) {
    Object.assign(this, partial);
  }
}
