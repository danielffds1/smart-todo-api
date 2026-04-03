export class CategoryReportDto {
    category: string;
    period: {
      start: Date;
      end: Date;
    };
 
    statistics: {
      total_tasks: number;
      completed_tasks: number;
      pending_tasks: number;
      in_progress_tasks: number;
      completion_rate: number;
      average_completion_time_hours: number | null;
    };
 
    by_priority: Array<{
      priority: string;
      count: number;
      percentage: number;
    }>;
 
    recent_tasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      created_at: Date;
      completed_at: Date | null;
    }>;
 
    trend: {
      previous_period_completion_rate: number;
      change_percentage: number;
      trend: 'up' | 'down' | 'stable';
    };
 
    constructor(partial: Partial<CategoryReportDto>) {
      Object.assign(this, partial);
    }
}
