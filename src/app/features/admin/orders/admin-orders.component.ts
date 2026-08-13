import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { AdminService } from '../../../core/services/admin.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';
import { OrderDto, OrderStatus, PAUSED_STATUSES, STATUS_META, statusLabel } from '../../../core/models';
import { AssignDesignerModalComponent, DesignerOption } from './app-assign-designer';

/** Convert API status (number OR string like "Draft") → numeric OrderStatus */
function normalizeOrderStatus(status: any): OrderStatus {
  if (typeof status === 'number') return status as OrderStatus;
  // string key → look up in enum
  const key = status as keyof typeof OrderStatus;
  if (key in OrderStatus) return OrderStatus[key] as unknown as OrderStatus;
  return OrderStatus.Draft;
}

/** Patch a raw API order so status is always the numeric enum value */
function normalizeOrder(o: any): OrderDto {
  return { ...o, status: normalizeOrderStatus(o.status) } as OrderDto;
}

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, AssignDesignerModalComponent],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.scss'
})
export class AdminOrdersComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly adminService = inject(AdminService);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(false);
  readonly orders = signal<OrderDto[]>([]);
  readonly totalCount = signal(0);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(15);

  readonly statusFilter = signal<string>('');
  readonly sortBy = signal<string>('date_desc');
  readonly search = signal<string>('');

  readonly designers = signal<DesignerOption[]>([]);
  readonly selectedOrder = signal<OrderDto | null>(null);
  readonly showAssignModal = signal(false);
  readonly isAssigning = signal(false);

  readonly OrderStatus = OrderStatus;
  readonly STATUS_META = STATUS_META;

  // Built once from the enum so new statuses never need a second edit.
  readonly statusOptions = [
    { value: '', label: 'كل الحالات' },
    ...Object.keys(OrderStatus)
      .filter(k => Number.isNaN(Number(k)))
      .map(key => ({
        value: key,
        label: statusLabel(OrderStatus[key as keyof typeof OrderStatus] as unknown as OrderStatus)
      }))
  ];

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));

  readonly filteredOrders = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.orders();
    return this.orders().filter(o =>
      o.orderCode?.toLowerCase().includes(term) ||
      o.patientName?.toLowerCase().includes(term) ||
      o.clientName?.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadOrders();
    this.loadDesigners();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.orderService
      .getOrders(this.pageNumber(), this.pageSize(), this.statusFilter() || undefined, this.sortBy())
      .subscribe({
        next: (res: any) => {
          const rawItems: any[] = res?.items || res?.data || res || [];
          this.orders.set(rawItems.map(normalizeOrder));
          this.totalCount.set(res?.totalCount ?? rawItems.length);
          this.isLoading.set(false);
        },
        error: () => {
          this.toast.error('حدث خطأ أثناء تحميل الطلبات');
          this.isLoading.set(false);
        }
      });
  }

  loadDesigners(): void {
    this.adminService.getDesigners(1, 200).subscribe({
      next: (res: any) => {
        const items = res?.items || res?.data || res || [];
        this.designers.set(
          items.map((u: any) => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            specialization: u.designerProfile?.specialization || '',
            rating: u.designerProfile?.rating || 0,
            level: u.designerProfile?.level || 0,
            isAvailable: u.designerProfile?.isAvailable ?? false,
          }))
        );
      },
      error: () => {
        this.toast.error('حدث خطأ أثناء تحميل المصممين');
      }
    });
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.pageNumber.set(1);
    this.loadOrders();
  }

  onSortChange(value: string): void {
    this.sortBy.set(value);
    this.loadOrders();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.pageNumber.set(page);
    this.loadOrders();
  }

  openAssignModal(order: OrderDto): void {
    this.selectedOrder.set(order);
    this.showAssignModal.set(true);
  }

  closeAssignModal(): void {
    this.showAssignModal.set(false);
    this.selectedOrder.set(null);
  }

  onAssign(payload: { designerId: string }): void {
    const order = this.selectedOrder();
    if (!order) return;
    this.isAssigning.set(true);
    this.orderService.assignDesigner(order.id, payload.designerId).subscribe({
      next: () => {
        this.toast.success('تم إسناد الطلب للمصمم بنجاح');
        this.isAssigning.set(false);
        this.closeAssignModal();
        this.loadOrders();
      },
      error: () => {
        this.toast.error('تعذر إسناد الطلب، حاول مرة أخرى');
        this.isAssigning.set(false);
      }
    });
  }

  statusLabel(status: OrderStatus): string {
    return statusLabel(status);
  }

  statusMeta(status: OrderStatus) {
    return STATUS_META[status];
  }

  isSlaBreached(order: OrderDto): boolean {
    if (!order.slaTracking?.dueAt) {
      return false;
    }
    if (order.status === OrderStatus.Completed) {
      return false;
    }
    if (PAUSED_STATUSES.has(order.status)) {
      return false;
    }

    const dueTime = Date.parse(order.slaTracking.dueAt);
    if (Number.isNaN(dueTime)) {
      return !!order.slaTracking.isBreached;
    }

    return !!order.slaTracking.isBreached || dueTime < Date.now();
  }

  hasAssignedDesigner(order: OrderDto): boolean {
    return !!(order.designerId || order.designerName || order.designerCode);
  }

  findDesigner(order: OrderDto): DesignerOption | null {
    if (order.designerId) {
      return this.designers().find(d => d.id === order.designerId) ?? null;
    }
    return null;
  }

  getDesignerDisplay(order: OrderDto): string {
    if (order.designerName) return order.designerName;
    const designer = this.findDesigner(order);
    if (designer) return designer.fullName;
    return order.designerCode || 'مصمم معين';
  }

  getDesignerRating(order: OrderDto): number | null {
    const designer = this.findDesigner(order);
    return designer ? designer.rating : null;
  }

  getDesignerLevel(order: OrderDto): number | null {
    const designer = this.findDesigner(order);
    return designer ? designer.level : null;
  }

  canAssignDesigner(order: OrderDto): boolean {
    return !order.designerId || order.designerId === '';
  }

  hasAvailableDesigners(): boolean {
    return this.designers().length > 0;
  }
}