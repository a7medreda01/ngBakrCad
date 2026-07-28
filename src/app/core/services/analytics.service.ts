import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface AnalyticsQueryRequest {
  month?: number;
  year?: number;
  from?: string;
  to?: string;
}

export interface OrderStatusCountDto {
  status: string;
  count: number;
  totalRevenue: number;
}

export interface DailyOrderCountDto {
  date: string;
  count: number;
  revenue: number;
}

export interface OrderStatsDto {
  totalOrders: number;
  newOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedByQualityOrders: number;
  inProgressOrders: number;
  expressOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalExpressFees: number;
  totalGumDesignFees: number;
  byStatus: OrderStatusCountDto[];
  dailyTrend: DailyOrderCountDto[];
}

export interface TopClientDto {
  clientId: string;
  clientCode: string;
  fullName: string;
  orderCount: number;
  totalRevenue: number;
}

export interface UserStatsDto {
  totalClients: number;
  newClients: number;
  totalDesigners: number;
  activeDesigners: number;
  totalAdmins: number;
  topClientsByOrders: TopClientDto[];
  topClientsByRevenue: TopClientDto[];
}

export interface DailyRevenueDto {
  date: string;
  revenue: number;
  paymentCount: number;
}

export interface TransactionTypeSummaryDto {
  type: string;
  count: number;
  totalAmount: number;
}

export interface FinancialStatsDto {
  totalRevenue: number;
  totalDeposits: number;
  totalWalletCreditsIssued: number;
  totalDesignerEarnings: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  platformNetProfit: number;
  dailyRevenueTrend: DailyRevenueDto[];
  byTransactionType: TransactionTypeSummaryDto[];
}

export interface TopDesignerDto {
  designerId: string;
  designerCode: string;
  fullName: string;
  completedOrders: number;
  totalEarnings: number;
  averageRating: number;
}

export interface DesignerStatsDto {
  totalAssignedOrders: number;
  totalCompletedOrders: number;
  totalRejectedByQuality: number;
  totalEarnings: number;
  pendingEarnings: number;
  withdrawableEarnings: number;
  topDesigners: TopDesignerDto[];
}

export interface TicketTypeSummaryDto {
  type: string;
  count: number;
}

export interface SupportStatsDto {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  averageResolutionHours: number;
  byType: TicketTypeSummaryDto[];
}

export interface MeetingStatsDto {
  totalRequests: number;
  approved: number;
  rejected: number;
  pending: number;
}

export interface SlaStatsDto {
  ordersWithSla: number;
  completedOnTime: number;
  completedLate: number;
  onTimeDeliveryRate: number;
  averageCycleHours: number;
}

export interface AnalyticsDto {
  from: string;
  to: string;
  periodLabel: string;
  orders: OrderStatsDto;
  users: UserStatsDto;
  financials: FinancialStatsDto;
  designers: DesignerStatsDto;
  support: SupportStatsDto;
  meetings: MeetingStatsDto;
  sla: SlaStatsDto;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly api = inject(ApiService);

  getAnalytics(query?: AnalyticsQueryRequest): Observable<AnalyticsDto> {
    const params: any = {};
    if (query?.month) params.month = query.month;
    if (query?.year) params.year = query.year;
    if (query?.from) params.from = query.from;
    if (query?.to) params.to = query.to;

    return this.api.get<AnalyticsDto>('Analytics', params);
  }
}
