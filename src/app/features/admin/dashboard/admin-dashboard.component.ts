import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  readonly i18n = inject(TranslationService);

  readonly isLoading = signal(true);
  readonly activeOrdersCount = signal(0);
  readonly designersCount = signal(5); // Simulated active designer pool
  readonly totalRevenue = signal(12500); // Simulated system revenue

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.orderService.getOrders(1, 10).subscribe({
      next: (res: any) => {
        const orders = res?.data || res?.items || res || [];
        this.activeOrdersCount.set(orders.length);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}
