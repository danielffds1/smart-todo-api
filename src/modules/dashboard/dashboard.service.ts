import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PeriodFilterDto, PeriodType } from './dto/period-filter.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { ProductivityChartDto } from './dto/productivity-chart.dto';
import { CategoryReportDto } from './dto/category-report.dto';
import { TodoStatus, TodoPriority } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  //Calcula as datas de início e fim baseado no período selecionado
  private calculatePeriod(filter: PeriodFilterDto): { start: Date; end: Date } {
    const end = new Date();
    let start = new Date();

    if (filter.period === PeriodType.CUSTOM && filter.start_date && filter.end_date) {
      start = new Date(filter.start_date);
      end.setTime(new Date(filter.end_date).getTime());
      end.setHours(23, 59, 59, 999);
    } else {
      switch (filter.period) {
        case PeriodType.TODAY:
          start.setHours(0, 0, 0, 0);
          break;
        case PeriodType.WEEK:
          start.setDate(end.getDate() - 7);
          break;
        case PeriodType.MONTH:
          start.setMonth(end.getMonth() - 1);
          break;
        case PeriodType.YEAR:
          start.setFullYear(end.getFullYear() - 1);
          break;
      }
    }

    return { start, end };
  }

  //Retorna estatísticas gerais do dashboard
  async getDashboardStats(userId: string, filter: PeriodFilterDto): Promise<DashboardStatsDto> {
    const { start, end } = this.calculatePeriod(filter);

    // Busca todas as tarefas do período
    const allTasks = await this.prisma.todo.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
    });

    const activeTasks = allTasks.filter((t) => !t.deletedAt);
    const deletedTasks = allTasks.filter((t) => t.deletedAt);

    // Estatísticas gerais
    const total = activeTasks.length;
    const completed = activeTasks.filter((t) => t.status === TodoStatus.COMPLETED).length;
    const pending = activeTasks.filter((t) => t.status === TodoStatus.PENDING).length;
    const inProgress = activeTasks.filter((t) => t.status === TodoStatus.IN_PROGRESS).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Estatísticas por prioridade
    const byPriority = Object.values(TodoPriority).map((priority) => {
      const tasks = activeTasks.filter((t) => t.priority === priority);
      const completedCount = tasks.filter((t) => t.status === TodoStatus.COMPLETED).length;
      return {
        priority,
        total: tasks.length,
        completed: completedCount,
        pending: tasks.filter((t) => t.status === TodoStatus.PENDING).length,
        in_progress: tasks.filter((t) => t.status === TodoStatus.IN_PROGRESS).length,
        completion_rate: tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0,
      };
    });

    // Estatísticas por categoria
    const categories = [...new Set(activeTasks.map((t) => t.category || 'sem_categoria'))];
    const byCategory = categories.map((category) => {
      const tasks = activeTasks.filter((t) => (t.category || 'sem_categoria') === category);
      const completedCount = tasks.filter((t) => t.status === TodoStatus.COMPLETED).length;
      return {
        category,
        total: tasks.length,
        completed: completedCount,
        pending: tasks.filter((t) => t.status === TodoStatus.PENDING).length,
        in_progress: tasks.filter((t) => t.status === TodoStatus.IN_PROGRESS).length,
        completion_rate: tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0,
      };
    });

    // Estatísticas por status
    const byStatus = Object.values(TodoStatus).map((status) => {
      const count = activeTasks.filter((t) => t.status === status).length;
      return {
        status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });

    const streak = await this.calculateStreak(userId);

    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyAverage = {
      created: Math.round((total / daysDiff) * 10) / 10,
      completed: Math.round((completed / daysDiff) * 10) / 10,
    };

    // Top 5 categorias
    const topCategories = byCategory
      .filter((c) => c.total >= 2)
      .sort((a, b) => b.completion_rate - a.completion_rate)
      .slice(0, 5)
      .map((c) => ({
        category: c.category,
        completion_rate: c.completion_rate,
        total_tasks: c.total,
      }));

    return new DashboardStatsDto({
      period: {
        start,
        end,
        type: filter.period as PeriodType,
      },
      overview: {
        total_tasks: total,
        completed_tasks: completed,
        pending_tasks: pending,
        in_progress_tasks: inProgress,
        completion_rate: completionRate,
        deleted_tasks: deletedTasks.length,
      },
      by_priority: byPriority,
      by_category: byCategory,
      by_status: byStatus,
      streak,
      daily_average: dailyAverage,
      top_categories: topCategories,
    });
  }

  //Calcula o streak (dias consecutivos com tarefas concluídas)
  private async calculateStreak(userId: string): Promise<{
    current_streak: number;
    longest_streak: number;
    last_completion_date: Date | null;
  }> {
    // Busca todas as tarefas concluídas, ordenadas por data
    const completedTasks = await this.prisma.todo.findMany({
      where: {
        userId,
        status: TodoStatus.COMPLETED,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    if (completedTasks.length === 0) {
      return { current_streak: 0, longest_streak: 0, last_completion_date: null };
    }

    // Agrupa por dia
    const daySet = new Set<string>();
    completedTasks.forEach((task) => {
      const day = task.updatedAt.toISOString().split('T')[0];
      daySet.add(day);
    });

    const days = Array.from(daySet).sort().reverse();

    // Calcula streak atual
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (days[0] === today || days[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < days.length; i++) {
        const prevDay = new Date(days[i - 1]);
        const currDay = new Date(days[i]);
        const diffDays = Math.round((prevDay.getTime() - currDay.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calcula maior streak
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < days.length; i++) {
      const prevDay = new Date(days[i - 1]);
      const currDay = new Date(days[i]);
      const diffDays = Math.round((prevDay.getTime() - currDay.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completion_date: completedTasks[0].updatedAt,
    };
  }

  //Retorna dados para gráfico de produtividade
  async getProductivityChart(userId: string, filter: PeriodFilterDto): Promise<ProductivityChartDto> {
    const { start, end } = this.calculatePeriod(filter);

    // Busca todas as tarefas do período
    const tasks = await this.prisma.todo.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Gera array de dias do período
    const days: string[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      days.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Dados diários
    const dailyData = days.map((day) => {
      const dayTasks = tasks.filter((t) => t.createdAt.toISOString().split('T')[0] === day);
      const completed = dayTasks.filter((t) => t.status === TodoStatus.COMPLETED).length;
      const total = dayTasks.length;

      return {
        date: day,
        total_created: total,
        total_completed: completed,
        pending: dayTasks.filter((t) => t.status === TodoStatus.PENDING).length,
        in_progress: dayTasks.filter((t) => t.status === TodoStatus.IN_PROGRESS).length,
        completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    // Distribuição por hora
    const completedTasks = tasks.filter((t) => t.status === TodoStatus.COMPLETED);
    const hourCounts = new Array(24).fill(0);

    completedTasks.forEach((task) => {
      const hour = task.updatedAt.getHours();
      hourCounts[hour]++;
    });

    const totalCompleted = completedTasks.length;
    const hourlyDistribution = hourCounts.map((count, hour) => ({
      hour,
      tasks_completed: count,
      percentage: totalCompleted > 0 ? Math.round((count / totalCompleted) * 100) : 0,
    }));

    // Distribuição por dia da semana
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekCounts = new Array(7).fill(0).map(() => ({ created: 0, completed: 0 }));


    tasks.forEach((task) => {
      const dayOfWeek = task.createdAt.getDay();
      weekCounts[dayOfWeek].created++;
      if (task.status === TodoStatus.COMPLETED) {
        weekCounts[dayOfWeek].completed++;
      }
    });

    const weeklyDistribution = weekCounts.map((counts, index) => ({
      day_of_week: dayNames[index],
      day_number: index,
      tasks_created: counts.created,
      tasks_completed: counts.completed,
      completion_rate:
        counts.created > 0 ? Math.round((counts.completed / counts.created) * 100) : 0,
    }));

    return new ProductivityChartDto({
      period: {
        start,
        end,
        type: filter.period as PeriodType,
      },
      daily_data: dailyData,
      hourly_distribution: hourlyDistribution,
      weekly_distribution: weeklyDistribution,
    });
  }

  //Retorna relatório detalhado de uma categoria
  async getCategoryReport(
    userId: string,
    category: string,
    filter: PeriodFilterDto,
  ): Promise<CategoryReportDto> {
    const { start, end } = this.calculatePeriod(filter);

    // Período atual
    const currentTasks = await this.prisma.todo.findMany({
      where: {
        userId,
        category: category === 'sem_categoria' ? null : category,
        createdAt: { gte: start, lte: end },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Período anterior (para comparação)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - daysDiff);
    const previousEnd = new Date(start);

    const previousTasks = await this.prisma.todo.findMany({
      where: {
        userId,
        category: category === 'sem_categoria' ? null : category,
        createdAt: { gte: previousStart, lt: previousEnd },
        deletedAt: null,
      },
    });

    // Estatísticas atuais
    const total = currentTasks.length;
    const completed = currentTasks.filter((t) => t.status === TodoStatus.COMPLETED).length;
    const pending = currentTasks.filter((t) => t.status === TodoStatus.PENDING).length;
    const inProgress = currentTasks.filter((t) => t.status === TodoStatus.IN_PROGRESS).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calcular tempo médio de conclusão
    const completedWithTime = currentTasks.filter(
      (t) => t.status === TodoStatus.COMPLETED && t.updatedAt && t.createdAt,
    );
    let avgCompletionTimeHours: number | null = null;
    if (completedWithTime.length > 0) {
      const totalHours = completedWithTime.reduce((sum, task) => {
        const hours = (task.updatedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgCompletionTimeHours = Math.round((totalHours / completedWithTime.length) * 10) / 10;
    }

    // Distribuição por prioridade
    const byPriority = Object.values(TodoPriority).map((priority) => {
      const count = currentTasks.filter((t) => t.priority === priority).length;
      return {
        priority,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });

    // Tarefas recentes
    const recentTasks = currentTasks.slice(0, 10).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      created_at: task.createdAt,
      completed_at: task.status === TodoStatus.COMPLETED ? task.updatedAt : null,
    }));

    //Comparação com período anterior
    const previousTotal = previousTasks.length;
    const previousCompleted = previousTasks.filter((t) => t.status === TodoStatus.COMPLETED).length;
    const previousCompletionRate = previousTotal > 0 ? Math.round((previousCompleted / previousTotal) * 100) : 0;

    const changePercentage = previousCompletionRate > 0
      ? Math.round(((completionRate - previousCompletionRate) / previousCompletionRate) * 100)
      : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercentage > 5) trend = 'up';
    else if (changePercentage < -5) trend = 'down';

    return new CategoryReportDto({
      category,
      period: { start, end },
      statistics: {
        total_tasks: total,
        completed_tasks: completed,
        pending_tasks: pending,
        in_progress_tasks: inProgress,
        completion_rate: completionRate,
        average_completion_time_hours: avgCompletionTimeHours,
      },
      by_priority: byPriority,
      recent_tasks: recentTasks,
      trend: {
        previous_period_completion_rate: previousCompletionRate,
        change_percentage: changePercentage,
        trend,
      },
    });
  }

  //Retorna resumo rápido (para exibição no topo do dashboard)
  async getQuickSummary(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);


    const [todayTasks, weekTasks, monthTasks, allActiveTasks] = await Promise.all([
      // Tarefas de hoje
      this.prisma.todo.count({
        where: {
          userId,
          createdAt: { gte: today },
          deletedAt: null,
        },
      }),
      // Tarefas da semana
      this.prisma.todo.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          deletedAt: null,
        },
      }),
      // Tarefas do mês
      this.prisma.todo.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          deletedAt: null,
        },
      }),
      // Todas as tarefas ativas
      this.prisma.todo.findMany({
        where: {
          userId,
          deletedAt: null,
        },
      }),
    ]);

    const totalActive = allActiveTasks.length;
    const completedActive = allActiveTasks.filter((t) => t.status === TodoStatus.COMPLETED).length;
    const pendingActive = allActiveTasks.filter((t) => t.status === TodoStatus.PENDING).length;

    return {
      today: todayTasks,
      this_week: weekTasks,
      this_month: monthTasks,
      total_active: totalActive,
      total_completed: completedActive,
      total_pending: pendingActive,
      overall_completion_rate:
        totalActive > 0 ? Math.round((completedActive / totalActive) * 100) : 0,
    };
  }
}
