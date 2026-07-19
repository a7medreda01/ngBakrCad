import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DesignerService } from '../../../core/services/designer.service';
import { WalletService } from '../../../core/services/wallet.service';
import { DesignerDashboardDto } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-lab-financials',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lab-financials.component.html',
  styleUrl: './lab-financials.component.scss'
})
export class LabFinancialsComponent implements OnInit {
  private readonly designerService = inject(DesignerService);
  private readonly walletService = inject(WalletService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(false);
  readonly dashboardData = signal<DesignerDashboardDto | null>(null);
  readonly earnings = signal<any[]>([]); // list of designer billings/earnings
  
  // Withdrawal request properties
  readonly minWithdrawalLimit = signal<number>(500);
  readonly isWithdrawalModalOpen = signal(false);
  readonly isSubmittingWithdrawal = signal(false);
  withdrawalAmountInput = 0;
  paymentMethod = 'STCPay';
  paymentDetails = '';
  readonly withdrawalHistory = signal<any[]>([]);

  // Performance metrics
  readonly withdrawableAmount = computed(() => this.dashboardData()?.withdrawableBalance || 0);
  readonly pendingAmount = computed(() => this.dashboardData()?.pendingBalance || 0);
  readonly deferredAmount = computed(() => this.dashboardData()?.deferredBalance || 0);
  readonly totalEarned = computed(() => this.dashboardData()?.totalEarned || 0);
  readonly completedCount = computed(() => this.dashboardData()?.totalCompletedOrders || 0);

  // Performance calculation: Completed vs Active Ratio
  readonly activeCount = computed(() => this.dashboardData()?.activeOrders || 0);
  readonly completionRatePercent = computed(() => {
    const comp = this.completedCount();
    const act = this.activeCount();
    if (comp + act === 0) return 100;
    return Math.round((comp / (comp + act)) * 100);
  });

  ngOnInit(): void {
    this.loadDashboard();
    this.loadEarningsHistory();
    this.loadMinWithdrawalLimit();
    this.loadWithdrawalHistory();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.designerService.getDashboard().subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('فشل تحميل البيانات المالية');
      }
    });
  }

  loadEarningsHistory(): void {
    // Fetches all designer billings
    this.designerService.getEarnings(1, 100).subscribe({
      next: (res: any) => {
        this.earnings.set(res?.items || res?.data || res || []);
      },
      error: () => {
        this.toast.error('فشل تحميل سجل الأرباح');
      }
    });
  }

  loadMinWithdrawalLimit(): void {
    this.walletService.getPublicSetting('MinimumWithdrawalAmount').subscribe({
      next: (res: any) => {
        if (res && res.value) {
          this.minWithdrawalLimit.set(+res.value);
        }
      }
    });
  }

  loadWithdrawalHistory(): void {
    this.walletService.getMyWithdrawals().subscribe({
      next: (res: any) => {
        this.withdrawalHistory.set(res || []);
      }
    });
  }

  openWithdrawalModal(): void {
    this.withdrawalAmountInput = this.withdrawableAmount();
    this.paymentDetails = '';
    this.isWithdrawalModalOpen.set(true);
  }

  closeWithdrawalModal(): void {
    this.isWithdrawalModalOpen.set(false);
  }

  submitWithdrawalRequest(): void {
    const amount = this.withdrawalAmountInput;
    if (amount < this.minWithdrawalLimit()) {
      this.toast.error(`الحد الأدنى لطلب السحب هو ${this.minWithdrawalLimit()} ريال سعودي`);
      return;
    }
    if (amount > this.withdrawableAmount()) {
      this.toast.error('المبلغ المطلوب يتجاوز الرصيد المتاح للسحب');
      return;
    }
    if (!this.paymentDetails.trim()) {
      this.toast.error('يرجى إدخال تفاصيل وسيلة الدفع (مثل رقم الجوال أو الآيبان)');
      return;
    }

    this.isSubmittingWithdrawal.set(true);
    this.walletService.submitWithdrawal({
      amount,
      paymentMethod: this.paymentMethod,
      paymentDetails: this.paymentDetails
    }).subscribe({
      next: (res: any) => {
        this.toast.success(res?.message || 'تم تقديم طلب السحب بنجاح وهو قيد المراجعة حالياً');
        this.isSubmittingWithdrawal.set(false);
        this.isWithdrawalModalOpen.set(false);
        this.loadDashboard();
        this.loadWithdrawalHistory();
      },
      error: (err) => {
        this.isSubmittingWithdrawal.set(false);
        this.toast.error(err?.error?.message || 'فشل إرسال طلب السحب');
      }
    });
  }

  earningStatusLabel(status: string): { label: string; css: string } {
    const map: Record<string, { label: string; css: string }> = {
      'Pending': { label: 'معلق (انتظار إنجاز الحالة)', css: 'bg-slate-100 text-slate-700 border border-slate-200' },
      'Deferred': { label: 'قيد التدقيق الدوري (انتظار سداد العميل)', css: 'bg-amber-50 text-amber-700 border border-amber-200' },
      'Withdrawable': { label: 'جاهز للسحب', css: 'bg-green-50 text-green-700 border border-green-200' },
      'Paid': { label: 'تم سحبه بنجاح', css: 'bg-blue-50 text-blue-700 border border-blue-200' }
    };
    return map[status] || { label: status || 'غير معروف', css: 'bg-slate-100 text-slate-500' };
  }

  withdrawalStatusLabel(status: string): { label: string; css: string } {
    const map: Record<string, { label: string; css: string }> = {
      'Pending': { label: 'تحت المراجعة', css: 'bg-amber-50 text-amber-700' },
      'Approved': { label: 'تم التحويل', css: 'bg-green-50 text-green-700' },
      'Rejected': { label: 'مرفوض', css: 'bg-red-50 text-red-700' }
    };
    return map[status] || { label: status || 'غير معروف', css: 'bg-slate-100 text-slate-500' };
  }

  paymentMethodLabel(method: string): string {
    const map: Record<string, string> = {
      BankTransfer: 'تحويل بنكي',
      STCPay: 'STC Pay',
      PayPal: 'PayPal'
    };
    return map[method] || method;
  }
}
