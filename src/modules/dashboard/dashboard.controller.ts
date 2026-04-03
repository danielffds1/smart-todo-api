import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { PeriodFilterDto } from './dto/period-filter.dto';


@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getQuickSummary(@GetUser('id') userId: string) {
    return this.dashboardService.getQuickSummary(userId);
  }

  @Get('stats')
  getDashboardStats(
    @GetUser('id') userId: string,
    @Query() filter: PeriodFilterDto,
  ) {
    return this.dashboardService.getDashboardStats(userId, filter);
  }

  @Get('productivity')
  getProductivityChart(
    @GetUser('id') userId: string,
    @Query() filter: PeriodFilterDto,
  ) {
    return this.dashboardService.getProductivityChart(userId, filter);
  }

  @Get('category/:category')
  getCategoryReport(
    @GetUser('id') userId: string,
    @Param('category') category: string,
    @Query() filter: PeriodFilterDto,
  ) {
    return this.dashboardService.getCategoryReport(userId, category, filter);
  }
}
