import { TodoStatus, TodoPriority } from '@prisma/client';
//Interface para estatísticas básicas
export interface BasicStats {
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  completion_rate: number;
}

//Interface para dados de gráfico temporal
export interface TimeSeriesData {
  date: string;
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
}

//Interface para dados por categoria
export interface CategoryData {
  category: string;
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  completion_rate: number;
}

//Interface para dados por prioridade
export interface PriorityData {
  priority: TodoPriority;
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  completion_rate: number;
}

//Interface para streak (sequência de dias)
export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_completion_date: Date | null;
}

//Interface para horários mais produtivos 
export interface ProductiveHoursData {
  hour: number;
  tasks_completed: number;
  percentage: number;
}
