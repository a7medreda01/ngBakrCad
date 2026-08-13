import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { SupportService } from '../../../../core/services/support.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { OrderDto, OrderStatus, SupportTicketDto } from '../../../../core/models';

@Component({
  selector: 'app-recent-activity-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-surface rounded-3xl border border-border p-6 sm:p-7 shadow-xl mb-8 transition-all duration-300">
      <!-- Header Title & Controls -->
      <div class="flex flex-col gap-4 pb-5 border-b border-border">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black shadow-inner">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="flex flex-col">
            <h2 class="text-lg font-black text-secondary">أحدث النشاطات والطلبات الحالية</h2>
            <p class="text-xs text-text-secondary">متابعة فورية للطلبات المعلقة والجديدة والتذاكر الطارئة</p>
          </div>
        </div>

        <!-- Quick Switch Tabs -->
       <!-- Quick Switch Tabs -->
<div class="w-full sm:w-auto">
  <!-- Mobile: stacked full-width buttons -->
  <div class="grid grid-cols-1 gap-2 sm:hidden">
    <button
      (click)="activeTab.set('pending')"
      class="w-full px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-between"
      [class.bg-primary]="activeTab() === 'pending'"
      [class.text-white]="activeTab() === 'pending'"
      [class.shadow-md]="activeTab() === 'pending'"
      [class.bg-background]="activeTab() !== 'pending'"
      [class.border]="activeTab() !== 'pending'"
      [class.border-border]="activeTab() !== 'pending'"
      [class.text-text-secondary]="activeTab() !== 'pending'"
    >
      <span>الطلبات المعلقة</span>
      <span class="px-2 py-0.5 rounded-full text-[10px] font-black"
            [class.bg-white]="activeTab() === 'pending'"
            [class.text-primary]="activeTab() === 'pending'"
            [class.bg-amber-500/10]="activeTab() !== 'pending'"
            [class.text-amber-600]="activeTab() !== 'pending'">
        {{ pendingOrders().length }}
      </span>
    </button>

    <button
      (click)="activeTab.set('new')"
      class="w-full px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-between"
      [class.bg-primary]="activeTab() === 'new'"
      [class.text-white]="activeTab() === 'new'"
      [class.shadow-md]="activeTab() === 'new'"
      [class.bg-background]="activeTab() !== 'new'"
      [class.border]="activeTab() !== 'new'"
      [class.border-border]="activeTab() !== 'new'"
      [class.text-text-secondary]="activeTab() !== 'new'"
    >
      <span>الطلبات الجديدة</span>
      <span class="px-2 py-0.5 rounded-full text-[10px] font-black"
            [class.bg-white]="activeTab() === 'new'"
            [class.text-primary]="activeTab() === 'new'"
            [class.bg-blue-500/10]="activeTab() !== 'new'"
            [class.text-blue-600]="activeTab() !== 'new'">
        {{ newOrders().length }}
      </span>
    </button>

    <button
      (click)="activeTab.set('inquiries')"
      class="w-full px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-between"
      [class.bg-primary]="activeTab() === 'inquiries'"
      [class.text-white]="activeTab() === 'inquiries'"
      [class.shadow-md]="activeTab() === 'inquiries'"
      [class.bg-background]="activeTab() !== 'inquiries'"
      [class.border]="activeTab() !== 'inquiries'"
      [class.border-border]="activeTab() !== 'inquiries'"
      [class.text-text-secondary]="activeTab() !== 'inquiries'"
    >
      <span>الاستفسارات والتذاكر</span>
      <span class="px-2 py-0.5 rounded-full text-[10px] font-black"
            [class.bg-white]="activeTab() === 'inquiries'"
            [class.text-primary]="activeTab() === 'inquiries'"
            [class.bg-rose-500/10]="activeTab() !== 'inquiries'"
            [class.text-rose-600]="activeTab() !== 'inquiries'">
        {{ recentInquiries().length }}
      </span>
    </button>
  </div>

  <!-- Desktop/tablet: original inline pill group -->
  <div class="hidden sm:flex items-center bg-background p-1 rounded-2xl border border-border flex-wrap gap-1">
    <button
      (click)="activeTab.set('pending')"
      class="px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
      [class.bg-primary]="activeTab() === 'pending'"
      [class.text-white]="activeTab() === 'pending'"
      [class.shadow-md]="activeTab() === 'pending'"
      [class.text-text-secondary]="activeTab() !== 'pending'"
    >
      <span>الطلبات المعلقة (انتظار إجراء)</span>
      <span class="px-2 py-0.5 rounded-full text-[10px] font-black" [class.bg-white]="activeTab() === 'pending'" [class.text-primary]="activeTab() === 'pending'" [class.bg-amber-500/10]="activeTab() !== 'pending'" [class.text-amber-600]="activeTab() !== 'pending'">
        {{ pendingOrders().length }}
      </span>
    </button>

    <button
      (click)="activeTab.set('new')"
      class="px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
      [class.bg-primary]="activeTab() === 'new'"
      [class.text-white]="activeTab() === 'new'"
      [class.shadow-md]="activeTab() === 'new'"
      [class.text-text-secondary]="activeTab() !== 'new'"
    >
      <span>الطلبات الجديدة</span>
      <span class="px-2 py-0.5 rounded-full text-[10px] font-black" [class.bg-white]="activeTab() === 'new'" [class.text-primary]="activeTab() === 'new'" [class.bg-blue-500/10]="activeTab() !== 'new'" [class.text-blue-600]="activeTab() !== 'new'">
        {{ newOrders().length }}
      </span>
    </button>

    <button
      (click)="activeTab.set('inquiries')"
      class="px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
      [class.bg-primary]="activeTab() === 'inquiries'"
      [class.text-white]="activeTab() === 'inquiries'"
      [class.shadow-md]="activeTab() === 'inquiries'"
      [class.text-text-secondary]="activeTab() !== 'inquiries'"
    >
      <span>أحدث الاستفسارات والتذاكر</span>
      <span class="px-2 py-0.5 rounded-full text-[10px] font-black" [class.bg-white]="activeTab() === 'inquiries'" [class.text-primary]="activeTab() === 'inquiries'" [class.bg-rose-500/10]="activeTab() !== 'inquiries'" [class.text-rose-600]="activeTab() !== 'inquiries'">
        {{ recentInquiries().length }}
      </span>
    </button>
  </div>
</div>

      <!-- Main Content Grid -->
      <div class="mt-6">
        @if (isLoading()) {
          <div class="py-12 text-center text-xs text-text-secondary flex flex-col items-center gap-3">
            <div class="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <span>جاري تحميل أحدث البيانات والطلبات...</span>
          </div>
        } @else {
          <!-- PENDING ADMIN ACTION ORDERS TAB -->
          @if (activeTab() === 'pending') {
            @if (pendingOrders().length === 0) {
              <div class="py-10 text-center flex flex-col items-center gap-2 bg-background/50 rounded-2xl border border-dashed border-border">
                <svg class="w-10 h-10 text-emerald-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span class="text-xs font-bold text-secondary">ممتاز! لا توجد طلبات معلقة تتطلب إجراء حالياً</span>
                <span class="text-[11px] text-text-secondary">تمت معالجة كافة الطلبات الواردة</span>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (ord of pendingOrders(); track ord.id) {
                  <div class="bg-background rounded-2xl border border-border p-4 flex flex-col justify-between hover:border-primary/50 transition duration-200 group shadow-sm">
                    <div class="flex flex-col gap-2">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-black text-primary font-mono dir-ltr">#{{ ord.orderCode }}</span>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          {{ getStatusLabel(ord.status) }}
                        </span>
                      </div>
                      <h4 class="text-sm font-bold text-secondary truncate">{{ ord.patientName || 'مريض غير محدد' }}</h4>
                      <div class="flex items-center justify-between text-[11px] text-text-secondary">
                        <span>العميل/الطبيب:</span>
                        <span class="font-bold text-secondary">{{ getDoctorDisplayName(ord) }}</span>
                      </div>
                      <div class="flex items-center justify-between text-[11px] text-text-secondary">
                        <span>نوع الخدمة:</span>
                        <span class="font-semibold text-secondary">{{ ord.services[0]?.nameAr || 'خدمة أسنان' }}</span>
                      </div>
                    </div>

                    <div class="flex items-center justify-between pt-3 mt-3 border-t border-border/60">
                      <span class="text-[10px] text-text-secondary">{{ ord.createdAt | date:'short' }}</span>
                      <a [routerLink]="['/admin/orders', ord.id]" class="text-xs font-extrabold text-primary hover:underline flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
                        <span>معاينة واتخاذ إجراء</span>
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </a>
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- NEW ORDERS TAB -->
          @if (activeTab() === 'new') {
            @if (newOrders().length === 0) {
              <div class="py-10 text-center flex flex-col items-center gap-2 bg-background/50 rounded-2xl border border-dashed border-border">
                <span class="text-xs font-bold text-secondary">لا توجد طلبات جديدة حالياً</span>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (ord of newOrders(); track ord.id) {
                  <div class="bg-background rounded-2xl border border-border p-4 flex flex-col justify-between hover:border-primary/50 transition duration-200 group shadow-sm">
                    <div class="flex flex-col gap-2">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-black text-primary font-mono dir-ltr">#{{ ord.orderCode }}</span>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          جديد
                        </span>
                      </div>
                      <h4 class="text-sm font-bold text-secondary truncate">{{ ord.patientName || 'مريض غير محدد' }}</h4>
                      <div class="flex items-center justify-between text-[11px] text-text-secondary">
                        <span>الطبيب / العميل:</span>
                        <span class="font-bold text-secondary">{{ getDoctorDisplayName(ord) }}</span>
                      </div>
                    </div>

                    <div class="flex items-center justify-between pt-3 mt-3 border-t border-border/60">
                      <span class="text-[10px] text-text-secondary">{{ ord.createdAt | date:'short' }}</span>
                      <a [routerLink]="['/admin/orders', ord.id]" class="text-xs font-extrabold text-primary hover:underline">
                        عرض التفاصيل
                      </a>
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- RECENT INQUIRIES & TICKETS TAB -->
          @if (activeTab() === 'inquiries') {
            @if (recentInquiries().length === 0) {
              <div class="py-10 text-center flex flex-col items-center gap-2 bg-background/50 rounded-2xl border border-dashed border-border">
                <span class="text-xs font-bold text-secondary">لا توجد استفسارات جديدة</span>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (inq of recentInquiries(); track inq.id) {
                  <div class="bg-background rounded-2xl border border-border p-4 flex flex-col justify-between hover:border-primary/50 transition shadow-sm">
                    <div class="flex flex-col gap-2">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-secondary truncate">{{ inq.subject || 'استفسار عام' }}</span>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                          {{ inq.status || 'مفتوح' }}
                        </span>
                      </div>
                      <p class="text-xs text-text-secondary line-clamp-2 leading-relaxed">{{ inq.lastMessageBody || inq.description || 'لا يتوفر تفاصيل إضافية' }}</p>
                      <div class="flex items-center justify-between text-[11px] text-text-secondary">
                        <span>العميل:</span>
                        <span class="font-bold text-secondary">{{ inq.clientName || inq.userName || 'عميل' }}</span>
                      </div>
                    </div>

                    <div class="flex items-center justify-between pt-3 mt-3 border-t border-border/60">
                      <span class="text-[10px] text-text-secondary">{{ inq.createdAt | date:'short' }}</span>
                      <a routerLink="/admin/support" class="text-xs font-extrabold text-primary hover:underline">
                        الرد والتفاعل
                      </a>
                    </div>
                  </div>
                }
              </div>
            }
          }
        }
      </div>
    </div>
  `
})
export class RecentActivityWidgetComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly supportService = inject(SupportService);

  readonly isLoading = signal(true);
  readonly activeTab = signal<'pending' | 'new' | 'inquiries'>('pending');

  readonly pendingOrders = signal<OrderDto[]>([]);
  readonly newOrders = signal<OrderDto[]>([]);
  readonly recentInquiries = signal<any[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    // Fetch Orders
    this.orderService.getOrders(1, 20).subscribe({
      next: (res) => {
        const items: OrderDto[] = res?.items || res || [];
        
        // Categorize Orders
        const pending = items.filter(o =>
          o.status === OrderStatus.PendingAdminReview ||
          o.status === OrderStatus.DoctorRevisionRequested ||
          o.status === OrderStatus.WaitingAdminResponse ||
          o.status === OrderStatus.QualityReview ||
          o.status === OrderStatus.LabReview ||
          o.status === OrderStatus.WaitingClientResponse ||
          String(o.status) === 'PendingAdminReview' ||
          String(o.status) === 'DoctorRevisionRequested'
        );

        const newlyCreated = items.filter(o =>
          o.status === OrderStatus.Draft ||
          o.status === OrderStatus.PendingAdminReview ||
          String(o.status) === 'Draft' ||
          String(o.status) === 'PendingAdminReview'
        );

        this.pendingOrders.set(pending);
        this.newOrders.set(newlyCreated);

        this.checkLoadingState();
      },
      error: () => this.checkLoadingState()
    });

    // Fetch Inquiries / Tickets
    this.supportService.getTickets(1, 10).subscribe({
      next: (res) => {
        const items = res?.items || res || [];
        this.recentInquiries.set(items);
        this.checkLoadingState();
      },
      error: () => this.checkLoadingState()
    });
  }

  private checkLoadingState(): void {
    this.isLoading.set(false);
  }

  getDoctorDisplayName(ord: any): string {
    const name = ord.clientName || ord.clientFullName || ord.doctorName || 'العميل';
    if (name.startsWith('د.')) return name;
    return `د. ${name}`;
  }

  getStatusLabel(status: any): string {
    switch (status) {
      case OrderStatus.PendingAdminReview:
      case 'PendingAdminReview':
        return 'بانتظار مراجعة الإدارة';
      case OrderStatus.DoctorRevisionRequested:
      case 'DoctorRevisionRequested':
        return 'طلب تعديل من الطبيب';
      case OrderStatus.QualityReview:
      case 'QualityReview':
        return 'مراجعة الجودة';
      case OrderStatus.WaitingAdminResponse:
      case 'WaitingAdminResponse':
        return 'بانتظار رد الإدارة';
      case OrderStatus.WaitingClientResponse:
      case 'WaitingClientResponse':
        return 'بانتظار ملف من العميل';
      default:
        return String(status);
    }
  }
}
