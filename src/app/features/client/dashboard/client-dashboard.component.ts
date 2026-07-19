import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { OrderDto, OrderStatus } from '../../../core/models';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, BadgeComponent],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss'
})
export class ClientDashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly orderService = inject(OrderService);
  readonly translationService = inject(TranslationService);

  readonly isLoading = signal(true);
  readonly recentOrders = signal<OrderDto[]>([]);

  readonly stats = signal({
    active: 0,
    pending: 0,
    inDesign: 0,
    completed: 0
  });

  readonly OrderStatus = OrderStatus;

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.orderService.getMyOrders(1, 5).subscribe({
      next: (res: any) => {
        const orders: OrderDto[] = res?.data || res?.items || res || [];
        this.recentOrders.set(orders);
        this.stats.set({
          active: orders.filter((o: OrderDto) => ![OrderStatus.Completed, OrderStatus.Cancelled, OrderStatus.Draft].includes(o.status)).length,
          pending: orders.filter((o: OrderDto) => o.status === OrderStatus.PendingAdminReview).length,
          inDesign: orders.filter((o: OrderDto) => o.status === OrderStatus.InDesign).length,
          completed: orders.filter((o: OrderDto) => o.status === OrderStatus.Completed).length
        });
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getStatusBadge(status: OrderStatus): 'success' | 'warning' | 'danger' | 'primary' | 'info' {
    switch (status) {
      // Success states
      case OrderStatus.Completed:
      case OrderStatus.ReadyForDownload:
      case OrderStatus.ApprovedByQuality: return 'success';
      
      // Danger states
      case OrderStatus.Cancelled:
      case OrderStatus.RejectedByQuality:
      case OrderStatus.LabRejected:
      case OrderStatus.DoctorRevisionRequested: return 'danger';
      
      // Primary states (in progress with designer)
      case OrderStatus.InDesign:
      case OrderStatus.QualityReview:
      case OrderStatus.ReturnedToDesigner: return 'primary';
      
      // Warning states (waiting for client/doctor)
      case OrderStatus.WaitingClientReview:
      case OrderStatus.DoctorReview:
      case OrderStatus.WaitingDoctorResponse: return 'warning';
      
      // Info states (default)
      default: return 'info';
    }
  }

  getStatusLabel(status: OrderStatus): string {
    const labels: Record<number, string> = {
      [OrderStatus.Draft]: 'مسودة',
      [OrderStatus.PendingAdminReview]: 'قيد مراجعة الإدارة',
      [OrderStatus.AssignedToLab]: 'تم تحويله للمعمل',
      [OrderStatus.LabReview]: 'قيد مراجعة المعمل',
      [OrderStatus.LabRejected]: 'تم رفضه من المعمل',
      [OrderStatus.LabAccepted]: 'تم قبوله من المعمل',
      [OrderStatus.WaitingClientReview]: 'في انتظار مراجعتك',
      [OrderStatus.WaitingDoctorResponse]: 'في انتظار رد الطبيب',
      [OrderStatus.WaitingLabResponse]: 'في انتظار رد المعمل',
      [OrderStatus.WaitingAdminResponse]: 'في انتظار رد الإدارة',
      [OrderStatus.InDesign]: 'قيد التصميم',
      [OrderStatus.QualityReview]: 'قيد مراجعة الجودة',
      [OrderStatus.ReturnedToDesigner]: 'أعيد للمصمم',
      [OrderStatus.RejectedByQuality]: 'تم رفضه من الجودة',
      [OrderStatus.ApprovedByQuality]: 'تم إقراره من الجودة',
      [OrderStatus.DoctorReview]: 'قيد مراجعة الطبيب',
      [OrderStatus.DoctorRevisionRequested]: 'طلب تعديلات من الطبيب',
      [OrderStatus.ReadyForDownload]: 'جاهز للتنزيل',
      [OrderStatus.Completed]: 'مكتمل',
      [OrderStatus.Cancelled]: 'ملغي'
    };
    return labels[status] || 'غير معروف';
  }
}
