import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, AnalyticsDto, AnalyticsQueryRequest } from '../../../core/services/analytics.service';
import { TranslationService } from '../../../core/services/translation.service';

import { RecentActivityWidgetComponent } from './recent-activity-widget/recent-activity-widget.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RecentActivityWidgetComponent],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  readonly i18n = inject(TranslationService);

  readonly isLoading = signal<boolean>(true);
  readonly data = signal<AnalyticsDto | null>(null);

  // Filters
  readonly selectedMonth = signal<number>(new Date().getMonth() + 1);
  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly filterMode = signal<'month' | 'custom'>('month');
  readonly customFrom = signal<string>('');
  readonly customTo = signal<string>('');

  readonly months = [
    { value: 1, labelAr: 'يناير - 01', labelEn: 'January - 01' },
    { value: 2, labelAr: 'فبراير - 02', labelEn: 'February - 02' },
    { value: 3, labelAr: 'مارس - 03', labelEn: 'March - 03' },
    { value: 4, labelAr: 'أبريل - 04', labelEn: 'April - 04' },
    { value: 5, labelAr: 'مايو - 05', labelEn: 'May - 05' },
    { value: 6, labelAr: 'يونيو - 06', labelEn: 'June - 06' },
    { value: 7, labelAr: 'يوليو - 07', labelEn: 'July - 07' },
    { value: 8, labelAr: 'أغسطس - 08', labelEn: 'August - 08' },
    { value: 9, labelAr: 'سبتمبر - 09', labelEn: 'September - 09' },
    { value: 10, labelAr: 'أكتوبر - 10', labelEn: 'October - 10' },
    { value: 11, labelAr: 'نوفمبر - 11', labelEn: 'November - 11' },
    { value: 12, labelAr: 'ديسمبر - 12', labelEn: 'December - 12' }
  ];

  readonly years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Active Tab View in Analytics
  readonly activeTab = signal<'overview' | 'financials' | 'orders' | 'designers' | 'sla'>('overview');

  // SVG Chart Computations
  readonly dailyTrendChart = computed(() => {
    const trend = this.data()?.orders.dailyTrend || [];
    if (!trend.length) return { path: '', points: [], maxVal: 1 };

    const maxVal = Math.max(...trend.map(d => d.count), 5);
    const width = 600;
    const height = 180;

    const points = trend.map((item, idx) => {
      const x = (idx / Math.max(trend.length - 1, 1)) * (width - 40) + 20;
      const y = height - (item.count / maxVal) * (height - 40) - 20;
      return { x, y, item };
    });

    const path = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length ? `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z` : '';

    return { path, areaPath, points, maxVal, width, height };
  });

  readonly revenueTrendChart = computed(() => {
    const trend = this.data()?.financials.dailyRevenueTrend || [];
    if (!trend.length) return { points: [], maxVal: 1000 };

    const maxVal = Math.max(...trend.map(d => d.revenue), 1000);
    const width = 600;
    const height = 180;

    const points = trend.map((item, idx) => {
      const x = (idx / Math.max(trend.length - 1, 1)) * (width - 40) + 20;
      const y = height - (item.revenue / maxVal) * (height - 40) - 20;
      return { x, y, item };
    });

    const path = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length ? `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z` : '';

    return { path, areaPath, points, maxVal, width, height };
  });

  readonly orderStatusDonut = computed(() => {
    const statuses = this.data()?.orders.byStatus || [];
    const total = statuses.reduce((acc, curr) => acc + curr.count, 0);
    if (!total) return [];

    let accumulatedAngle = 0;
    const colors: Record<string, string> = {
      'Completed': '#10B981',
      'InDesign': '#3B82F6',
      'PendingAdminReview': '#F59E0B',
      'DoctorReview': '#8B5CF6',
      'QualityReview': '#EC4899',
      'RejectedByQuality': '#EF4444',
      'Cancelled': '#6B7280',
      'Draft': '#9CA3AF'
    };

    return statuses.map(st => {
      const percentage = (st.count / total) * 100;
      const angle = (st.count / total) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      return {
        ...st,
        percentage: Math.round(percentage),
        color: colors[st.status] || '#6366F1',
        startAngle,
        angle
      };
    });
  });

  readonly topClientsByOrdersBars = computed(() => {
    const clients = this.data()?.users.topClientsByOrders || [];
    if (!clients.length) return [];
    const maxOrders = Math.max(...clients.map(c => c.orderCount), 1);
    return clients.map(c => ({
      ...c,
      percent: Math.round((c.orderCount / maxOrders) * 100)
    }));
  });

  readonly topClientsByRevenueBars = computed(() => {
    const clients = this.data()?.users.topClientsByRevenue || [];
    if (!clients.length) return [];
    const maxRev = Math.max(...clients.map(c => c.totalRevenue), 1);
    return clients.map(c => ({
      ...c,
      percent: Math.round((c.totalRevenue / maxRev) * 100)
    }));
  });

  readonly topDesignersBars = computed(() => {
    const designers = this.data()?.designers.topDesigners || [];
    if (!designers.length) return [];
    const maxCompleted = Math.max(...designers.map(d => d.completedOrders), 1);
    const maxEarned = Math.max(...designers.map(d => d.totalEarnings), 1);
    return designers.map(d => ({
      ...d,
      completedPercent: Math.round((d.completedOrders / maxCompleted) * 100),
      earnedPercent: Math.round((d.totalEarnings / maxEarned) * 100)
    }));
  });

  readonly slaGaugeVisual = computed(() => {
    const rate = this.data()?.sla.onTimeDeliveryRate || 0;
    const circumference = 2 * Math.PI * 40; // R=40 => ~251.2
    const strokeDashoffset = circumference - (rate / 100) * circumference;
    return { rate, circumference, strokeDashoffset };
  });

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.isLoading.set(true);

    const query: AnalyticsQueryRequest = {};
    if (this.filterMode() === 'month') {
      query.month = Number(this.selectedMonth());
      query.year = Number(this.selectedYear());
    } else if (this.customFrom() && this.customTo()) {
      query.from = this.customFrom();
      query.to = this.customTo();
    }

    this.analyticsService.getAnalytics(query).subscribe({
      next: (res) => {
        this.data.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load analytics', err);
        this.isLoading.set(false);
      }
    });
  }

  setMonthFilter(m: number): void {
    this.selectedMonth.set(m);
    this.filterMode.set('month');
    this.loadAnalytics();
  }

  setYearFilter(y: number): void {
    this.selectedYear.set(y);
    this.filterMode.set('month');
    this.loadAnalytics();
  }

  applyCustomFilter(): void {
    if (this.customFrom() && this.customTo()) {
      this.filterMode.set('custom');
      this.loadAnalytics();
    }
  }

  resetFilters(): void {
    this.selectedMonth.set(new Date().getMonth() + 1);
    this.selectedYear.set(new Date().getFullYear());
    this.filterMode.set('month');
    this.customFrom.set('');
    this.customTo.set('');
    this.loadAnalytics();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'InDesign': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'PendingAdminReview': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DoctorReview': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'RejectedByQuality': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  }
}
