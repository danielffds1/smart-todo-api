export class ProductivityChartDto {
    period: {
      start: Date;
      end: Date;
      type: string;
    };
 
    daily_data: Array<{
      date: string;
      total_created: number;
      total_completed: number;
      pending: number;
      in_progress: number;
      completion_rate: number;
    }>;
 
    hourly_distribution: Array<{
      hour: number;
      tasks_completed: number;
      percentage: number;
    }>;
 
    weekly_distribution: Array<{
      day_of_week: string;
      day_number: number;
      tasks_completed: number;
      tasks_created: number;
      completion_rate: number;
    }>;
 
    constructor(partial: Partial<ProductivityChartDto>) {
      Object.assign(this, partial);
    }
  }
