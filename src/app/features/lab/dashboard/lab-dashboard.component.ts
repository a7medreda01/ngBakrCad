import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DesignerService } from '../../../core/services/designer.service';
import { WalletService } from '../../../core/services/wallet.service';
import { DesignerDashboardDto } from '../../../core/models';
import { OrderStatus } from '../../../core/enums';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-lab-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './lab-dashboard.component.html',
  styleUrl: './lab-dashboard.component.scss'
})
export class LabDashboardComponent implements OnInit {
  private readonly designerService = inject(DesignerService);
  private readonly walletService = inject(WalletService);
  private readonly toast = inject(ToastService);
  public readonly authService = inject(AuthService);
  public readonly OrderStatus = OrderStatus;

  readonly isLoading = signal(false);
  readonly dashboardData = signal<DesignerDashboardDto | null>(null);
  readonly recentCases = signal<any[]>([]);

  readonly withdrawableAmount = computed(() => this.dashboardData()?.withdrawableBalance || 0);

  // Dynamic withdrawal fields
  readonly minWithdrawalLimit = signal<number>(500);
  readonly isWithdrawalModalOpen = signal(false);
  readonly isSubmittingWithdrawal = signal(false);
  withdrawalAmountInput = 0;
  paymentMethod = 'STCPay';
  paymentDetails = '';
  readonly withdrawalHistory = signal<any[]>([]);

  ngOnInit(): void {
    this.loadDashboard();
    this.loadRecentCases();
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
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error('فشل تحميل بيانات لوحة التحكم');
      }
    });
  }

  loadRecentCases(): void {
    this.designerService.getOrders(1, 5).subscribe({
      next: (res) => {
        this.recentCases.set(res.items || []);
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
        this.toast.success(res?.message || 'تم إرسال طلب السحب بنجاح وهو قيد المراجعة حالياً');
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

  statusLabel(status: string): { label: string; css: string } {
    const map: Record<string, { label: string; css: string }> = {
      'Pending': { label: 'معلق تحت المراجعة', css: 'bg-amber-50 text-amber-700' },
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

  getNextLevelName(currentLevel?: string): string {
    if (!currentLevel || currentLevel === 'Bronze') return 'الفئة الفضية (Silver)';
    if (currentLevel === 'Silver') return 'الفئة الذهبية (Gold)';
    return 'الفئة الذهبية (أعلى فئة)';
  }

  getLevelProgress(currentLevel?: string, completedCount?: number): number {
    const count = completedCount || 0;
    if (!currentLevel || currentLevel === 'Bronze') {
      return Math.min(Math.round((count / 10) * 100), 100);
    }
    if (currentLevel === 'Silver') {
      const silverCount = Math.max(0, count - 10);
      return Math.min(Math.round((silverCount / 40) * 100), 100);
    }
    return 100;
  }

  getLevelEncouragement(currentLevel?: string, completedCount?: number): string {
    const count = completedCount || 0;
    if (!currentLevel || currentLevel === 'Bronze') {
      const remaining = Math.max(0, 10 - count);
      return remaining > 0 
        ? `أكمل المزيد من الحالات الإضافية للترقية إلى الفئة الفضية لزيادة أرباحك بنسبة 5% إضافية لكل حالة!`
        : `أنت جاهز للترقية للفئة الفضية!`;
    }
    if (currentLevel === 'Silver') {
      const remaining = Math.max(0, 50 - count);
      return remaining > 0 
        ? `أكمل المزيد من الحالات الإضافية للترقية إلى الفئة الذهبية لزيادة أرباحك بنسبة 10% والحصول على أولوية توزيع الحالات!`
        : `أنت جاهز للترقية للفئة الذهبية!`;
    }
    return 'تهانينا! لقد وصلت إلى أعلى فئة عضوية ذهبية. أنت الآن تستمتع بأعلى نسبة أرباح للمصممين وأولوية كاملة في استلام الحالات!';
  }
}
