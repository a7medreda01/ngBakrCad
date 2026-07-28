import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { TranslationService } from '../../../core/services/translation.service';
import { OrderDto, OrderStatus, STATUS_META, statusLabel } from '../../../core/models';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';

/** Convert API status (number OR string like "Draft") → numeric OrderStatus */
function normalizeOrderStatus(status: any): OrderStatus {
  if (typeof status === 'number') return status as OrderStatus;
  const key = status as keyof typeof OrderStatus;
  if (key in OrderStatus) return OrderStatus[key] as unknown as OrderStatus;
  return OrderStatus.Draft;
}
function normalizeOrder(o: any): OrderDto {
  return { ...o, status: normalizeOrderStatus(o.status) } as OrderDto;
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, BadgeComponent],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss'
})
export class OrderListComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  readonly i18n = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly orders = signal<OrderDto[]>([]);

  readonly searchTerm = signal('');
  readonly filterStatus = signal<string>('');
  readonly filterPriority = signal<string>('');

  readonly sortBy = signal<string>('createdDate');
  readonly sortDesc = signal<boolean>(true);

  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  /**
   * --- جديد: قائمة الفلترة بتتولد من STATUS_META مباشرة بدل أرقام هاردكود
   * (كان فيه value="1" بلابل "قيد المراجعة" مش دقيقة، وناقص أغلب الحالات) ---
   */
  readonly statusFilterOptions = Object.entries(STATUS_META)
    .filter(([key]) => !isNaN(Number(key)))
    .map(([key, meta]) => ({ value: key, label: meta.label }));

  /**
   * --- معدّل: الفلتر كان فيه باغ حقيقي هنا:
   * فلتر "الأولوية" (مستعجل / عادي) كان بيتحدد في filterPriority()
   * لكن ملوش أي تأثير فعلي، لأ الباك إند مش مستقبل بارامتر أولوية،
   * ولا الـ computed ده كان بيستخدمه في الفلترة أصلاً.
   * فدلوقتي بنفلتر بالأولوية محليًا (client-side) على orders() زي ما بنعمل بالظبط مع البحث النصي. ---
   */
  readonly filteredOrders = computed(() => {
    let list = this.orders();

    const query = this.searchTerm().toLowerCase().trim();
    if (query) {
      list = list.filter(o =>
        o.orderCode.toLowerCase().includes(query) ||
        (o.patientName && o.patientName.toLowerCase().includes(query)) ||
        (o.designerCode && o.designerCode.toLowerCase().includes(query))
      );
    }

    const priority = this.filterPriority();
    if (priority === 'express') {
      list = list.filter(o => !!o.expressChecked);
    } else if (priority === 'normal') {
      list = list.filter(o => !o.expressChecked);
    }

    return list;
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    const statusParam = this.filterStatus() || undefined;
    const sortParam = `${this.sortBy()}:${this.sortDesc() ? 'desc' : 'asc'}`;

    this.orderService.getMyOrders(this.currentPage(), this.pageSize(), statusParam, sortParam).subscribe({
      next: (res: any) => {
        const rawItems: OrderDto[] = res?.data || res?.items || res || [];
        this.orders.set(rawItems.map(normalizeOrder));
        this.totalItems.set(res?.totalCount || res?.length || 0);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  setSort(field: string): void {
    if (this.sortBy() === field) {
      this.sortDesc.set(!this.sortDesc());
    } else {
      this.sortBy.set(field);
      this.sortDesc.set(false);
    }
    this.loadOrders();
  }

  /**
   * --- معدّل: فلتر الأولوية (express/normal) بقى client-side بحت (مش محتاج يرجع لسيرفر)
   * عشان كده مش بنستدعي loadOrders() تاني لو اللي اتغير هو الأولوية بس،
   * أما فلتر الحالة (status) فلازم يرجع للسيرفر لأنه بيأثر على الـ pagination الحقيقية. ---
   */
  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadOrders();
  }

  onPriorityFilterChange(): void {
    // فلتر محلي فقط، مفيش داعي نرجع للسيرفر أو نصفّر الصفحة
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadOrders();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadOrders();
    }
  }

  getStatusBadge(status: OrderStatus): 'success' | 'warning' | 'danger' | 'primary' | 'info' {
    switch (status) {
      case OrderStatus.Completed:
      case OrderStatus.ApprovedByQuality:
      case OrderStatus.ReadyForDownload:
        return 'success';
      case OrderStatus.Cancelled:
      case OrderStatus.RejectedByQuality:
      case OrderStatus.LabRejected:
      case OrderStatus.DoctorRevisionRequested:
        return 'danger';
      case OrderStatus.InDesign:
      case OrderStatus.QualityReview:
        return 'primary';
      case OrderStatus.WaitingClientReview:
      case OrderStatus.DoctorReview:
      case OrderStatus.WaitingDoctorResponse:
      case OrderStatus.WaitingLabResponse:
      case OrderStatus.WaitingAdminResponse:
      case OrderStatus.ReturnedToDesigner:
        return 'warning';
      default:
        return 'info';
    }
  }

  getStatusClasses(status: OrderStatus): string {
    switch (this.getStatusBadge(status)) {
      case 'success':
        return 'bg-emerald-50 text-emerald-600';
      case 'warning':
        return 'bg-amber-50 text-amber-600';
      case 'danger':
        return 'bg-rose-50 text-rose-600';
      case 'primary':
        return 'bg-sky-50 text-sky-600';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  }

  /**
   * --- معدّل: statusLabel() المركزية بدل map محلي ناقص (نفس باغ order-detail) ---
   */
  getStatusLabel(status: OrderStatus): string {
    return statusLabel(status);
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}