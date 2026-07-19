import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DesignerService } from '../../../core/services/designer.service';
import { OrderDto } from '../../../core/models';
import { OrderStatus } from '../../../core/enums';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-lab-cases',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './lab-cases.component.html',
  styleUrl: './lab-cases.component.scss'
})
export class LabCasesComponent implements OnInit {
  private readonly designerService = inject(DesignerService);
  private readonly toast = inject(ToastService);
  public readonly OrderStatus = OrderStatus;

  readonly isLoading = signal(false);
  readonly cases = signal<OrderDto[]>([]);
  readonly totalCount = signal(0);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);

  // Filters
  readonly statusFilter = signal<string>('');
  readonly sortBy = signal<string>('date_desc');
  readonly searchQuery = signal<string>('');

  ngOnInit(): void {
    this.loadCases();
  }

  loadCases(): void {
    this.isLoading.set(true);
    this.designerService.getOrders(this.pageNumber(), this.pageSize(), this.statusFilter(), this.sortBy()).subscribe({
      next: (res) => {
        // Client side filtering for search query if needed
        let items: OrderDto[] = res.items || [];
        if (this.searchQuery().trim()) {
          const query = this.searchQuery().toLowerCase();
          items = items.filter(o => 
            o.orderCode.toLowerCase().includes(query) || 
            o.patientName.toLowerCase().includes(query)
          );
        }
        this.cases.set(items);
        this.totalCount.set(res.totalCount || items.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('فشل تحميل قائمة الحالات');
      }
    });
  }

  onFilterChange(status: string): void {
    this.statusFilter.set(status);
    this.pageNumber.set(1);
    this.loadCases();
  }

  onSortChange(sort: string): void {
    this.sortBy.set(sort);
    this.pageNumber.set(1);
    this.loadCases();
  }

  onSearch(event: any): void {
    this.searchQuery.set(event.target.value);
    this.pageNumber.set(1);
    this.loadCases();
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    this.loadCases();
  }

  // Accept/Reject workflow directly from list
  startReview(orderId: string): void {
    this.isLoading.set(true);
    // Use OrderStatus.LabReview
    this.designerService.updateOrderStatus(orderId, { status: OrderStatus.LabReview, notes: 'بدء مراجعة الحالة' }).subscribe({
      next: () => {
        this.toast.success('تم البدء في مراجعة الحالة');
        this.loadCases();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'فشل الانتقال إلى مرحلة المراجعة');
      }
    });
  }

  acceptOrder(orderId: string): void {
    this.isLoading.set(true);
    // Use OrderStatus.LabAccepted
    this.designerService.updateOrderStatus(orderId, { status: OrderStatus.LabAccepted, notes: 'قبول الحالة' }).subscribe({
      next: () => {
        // Auto transition accepted -> InDesign
        this.designerService.updateOrderStatus(orderId, { status: OrderStatus.InDesign, notes: 'بدء التصميم' }).subscribe({
          next: () => {
            this.toast.success('تم قبول الحالة والبدء في التصميم بنجاح');
            this.loadCases();
          },
          error: () => {
            this.toast.success('تم قبول الحالة بنجاح');
            this.loadCases();
          }
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'فشل قبول الحالة');
      }
    });
  }

  rejectOrder(orderId: string): void {
    const reason = prompt('يرجى إدخال سبب رفض الحالة:');
    if (reason === null) return; // cancelled prompt
    if (!reason.trim()) {
      this.toast.error('يجب إدخال سبب الرفض');
      return;
    }

    this.isLoading.set(true);
    // Use OrderStatus.LabRejected
    this.designerService.updateOrderStatus(orderId, { status: OrderStatus.LabRejected, notes: reason }).subscribe({
      next: () => {
        this.toast.warning('تم رفض الحالة وإعادتها للأدمن');
        this.loadCases();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'فشل رفض الحالة');
      }
    });
  }
}
