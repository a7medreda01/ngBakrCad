import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../core/services/wallet.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-financials',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-financials.component.html',
  styleUrl: './admin-financials.component.scss'
})
export class AdminFinancialsComponent implements OnInit {
  private readonly walletService = inject(WalletService);
  private readonly toast = inject(ToastService);

  activeTab = signal<'withdrawals' | 'pending-earnings'>('withdrawals');

  // Withdrawal requests
  readonly isLoadingWithdrawals = signal(false);
  readonly withdrawals = signal<any[]>([]);
  readonly processingId = signal<string | null>(null);
  readonly adminNotes: Record<string, string> = {};

  // Pending earnings
  readonly isLoadingEarnings = signal(false);
  readonly pendingEarnings = signal<any[]>([]);
  readonly processingEarningId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadWithdrawals();
    this.loadPendingEarnings();
  }

  loadWithdrawals(): void {
    this.isLoadingWithdrawals.set(true);
    this.walletService.getAllWithdrawals().subscribe({
      next: (res: any) => {
        this.withdrawals.set(Array.isArray(res) ? res : (res?.data || []));
        this.isLoadingWithdrawals.set(false);
      },
      error: () => {
        this.isLoadingWithdrawals.set(false);
        this.toast.error('فشل تحميل طلبات السحب');
      }
    });
  }

  loadPendingEarnings(): void {
    this.isLoadingEarnings.set(true);
    this.walletService.getPendingEarnings().subscribe({
      next: (res: any) => {
        this.pendingEarnings.set(Array.isArray(res) ? res : (res?.data || []));
        this.isLoadingEarnings.set(false);
      },
      error: () => {
        this.isLoadingEarnings.set(false);
        this.toast.error('فشل تحميل الأرباح المعلقة');
      }
    });
  }

  approveWithdrawal(id: string): void {
    this.processingId.set(id);
    this.walletService.approveWithdrawal(id, this.adminNotes[id]).subscribe({
      next: (res: any) => {
        this.toast.success(res?.message || 'تمت الموافقة على طلب السحب وإضافة الملاحظات');
        this.processingId.set(null);
        this.loadWithdrawals();
      },
      error: (err) => {
        this.processingId.set(null);
        this.toast.error(err?.error?.message || 'فشل الموافقة على طلب السحب');
      }
    });
  }

  rejectWithdrawal(id: string): void {
    this.processingId.set(id + '-reject');
    this.walletService.rejectWithdrawal(id, this.adminNotes[id]).subscribe({
      next: (res: any) => {
        this.toast.success(res?.message || 'تم رفض طلب السحب وإعادة المبلغ للمصمم');
        this.processingId.set(null);
        this.loadWithdrawals();
      },
      error: (err) => {
        this.processingId.set(null);
        this.toast.error(err?.error?.message || 'فشل رفض طلب السحب');
      }
    });
  }

  approveEarning(billingId: string): void {
    this.processingEarningId.set(billingId);
    this.walletService.approvePendingEarning(billingId).subscribe({
      next: (res: any) => {
        this.toast.success(res?.message || 'تم إثبات ربح المصمم وإضافته لرصيده');
        this.processingEarningId.set(null);
        this.loadPendingEarnings();
      },
      error: (err) => {
        this.processingEarningId.set(null);
        this.toast.error(err?.error?.message || 'فشل إثبات الربح');
      }
    });
  }

  statusLabel(status: string): { label: string; css: string } {
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

  earningStatusLabel(status: string): { label: string; css: string } {
    const map: Record<string, { label: string; css: string }> = {
      'Pending': { label: 'معلق (انتظار إنجاز الحالة)', css: 'bg-slate-100 text-slate-700' },
      'Deferred': { label: 'قيد التدقيق (انتظار سداد العميل)', css: 'bg-amber-50 text-amber-700' },
      'Withdrawable': { label: 'قابل للسحب', css: 'bg-green-50 text-green-700' },
      'Paid': { label: 'تم التحويل', css: 'bg-blue-50 text-blue-700' }
    };
    return map[status] || { label: status || 'غير معروف', css: 'bg-slate-100 text-slate-500' };
  }
}
