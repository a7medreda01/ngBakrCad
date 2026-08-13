import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api/api.service';
import { AdminService } from '../../../core/services/admin.service';
import { WalletService } from '../../../core/services/wallet.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserProfileDto, WalletTransactionDto } from '../../../core/models';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly adminService = inject(AdminService);
  private readonly walletService = inject(WalletService);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);
  readonly Math = Math;

  readonly isLoading = signal(true);
  readonly isLoadingTx = signal(false);
  readonly profile = signal<UserProfileDto | null>(null);
  readonly transactions = signal<WalletTransactionDto[]>([]);
  readonly activeTab = signal<'overview' | 'orders' | 'transactions'>('overview');
  readonly userId = signal<string>('');

  // Orders pagination
  readonly orders = signal<any[]>([]);
  readonly ordersTotalCount = signal<number>(0);
  readonly ordersPageNumber = signal<number>(1);
  readonly ordersPageSize = signal<number>(10);

  // Modals state
  readonly showAdjustModal = signal(false);
  readonly showCreditModal = signal(false);
  readonly showLevelModal = signal(false);

  readonly adjustAmount = signal(0);
  readonly adjustNotes = signal('');
  readonly adjustIsDebit = signal(false); // false = Add, true = Deduct
  readonly creditLimit = signal(0);
  readonly negativeAllowed = signal(false);
  readonly updateLevelForm = signal<{ level: string; rating: number | null }>({ level: 'Bronze', rating: null });

  // Transactions summary (credit vs debit) — computed live from loaded transactions.
  // NOTE: the API always returns `amount` as a positive number regardless of direction,
  // so direction must be derived from the actual balance movement (afterBalance vs beforeBalance),
  // never from the sign of `amount`.
  readonly txTotalCredit = computed(() =>
    this.transactions()
      .filter(t => Number(t.afterBalance) >= Number(t.beforeBalance))
      .reduce((sum, t) => sum + Math.abs(Number(t.afterBalance) - Number(t.beforeBalance)), 0)
  );

  readonly txTotalDebit = computed(() =>
    this.transactions()
      .filter(t => Number(t.afterBalance) < Number(t.beforeBalance))
      .reduce((sum, t) => sum + Math.abs(Number(t.afterBalance) - Number(t.beforeBalance)), 0)
  );

  readonly txNet = computed(() => this.txTotalCredit() - this.txTotalDebit());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.userId.set(id);
      this.loadProfile(id);
    }
  }

  loadProfile(id: string, pageNumber: number = 1): void {
    this.isLoading.set(pageNumber === 1);
    this.ordersPageNumber.set(pageNumber);
    this.api.get<any>(`Users/${id}/profile-full?pageNumber=${pageNumber}&pageSize=${this.ordersPageSize()}`).subscribe({
      next: (res) => {
        this.profile.set(res.profile);
        this.orders.set(res.orders || []);
        this.ordersTotalCount.set(res.ordersTotalCount || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('فشل تحميل بيانات المستخدم');
        this.isLoading.set(false);
      }
    });
  }

  changeOrdersPage(page: number): void {
    const id = this.userId();
    if (id) {
      this.loadProfile(id, page);
    }
  }

  loadTransactions(): void {
    const id = this.userId();
    if (!id) return;
    this.isLoadingTx.set(true);
    this.walletService.getTransactions(id).subscribe({
      next: (res: any) => {
        this.transactions.set(res?.items || res?.data || res || []);
        this.isLoadingTx.set(false);
      },
      error: () => this.isLoadingTx.set(false)
    });
  }

  setTab(tab: 'overview' | 'orders' | 'transactions'): void {
    this.activeTab.set(tab);
    if (tab === 'transactions' && this.transactions().length === 0) {
      this.loadTransactions();
    }
  }

  toggleActive(): void {
    const p = this.profile();
    if (!p) return;
    this.adminService.toggleActive(p.id).subscribe({
      next: (res) => {
        this.toast.success(res.message);
        this.loadProfile(p.id, this.ordersPageNumber());
      }
    });
  }

  openAdjustModal(): void {
    this.adjustAmount.set(0);
    this.adjustNotes.set('');
    this.adjustIsDebit.set(false);
    this.showAdjustModal.set(true);
  }

  submitAdjustment(): void {
    const p = this.profile();
    if (!p) return;

    this.walletService.adjustManualBalance(p.id, {
      amount: this.adjustAmount(),
      isDebit: this.adjustIsDebit(),
      notes: this.adjustNotes()
    }).subscribe({
      next: () => {
        this.toast.success('تمت تسوية رصيد المحفظة بنجاح');
        this.showAdjustModal.set(false);
        this.loadProfile(p.id, this.ordersPageNumber());
        if (this.activeTab() === 'transactions') this.loadTransactions();
      }
    });
  }

  openCreditModal(): void {
    const p = this.profile();
    if (!p) return;
    this.creditLimit.set(p.clientProfile?.creditLimit || 0);
    this.negativeAllowed.set(p.clientProfile?.negativeBalanceAllowed || false);
    this.showCreditModal.set(true);
  }

  submitCreditUpdate(): void {
    const p = this.profile();
    if (!p) return;

    this.walletService.updateCreditLimit(p.id, {
      creditLimit: this.creditLimit(),
      negativeBalanceAllowed: this.negativeAllowed()
    }).subscribe({
      next: () => {
        this.toast.success('تم تحديث الحد الائتماني بنجاح');
        this.showCreditModal.set(false);
        this.loadProfile(p.id);
      }
    });
  }

  openLevelModal(): void {
    const p = this.profile();
    if (!p) return;

    const profileData = p.roles.includes('Designer') || p.roles.includes('Lab')
      ? p.designerProfile
      : p.clientProfile;

    this.updateLevelForm.set({
      level: (profileData as any)?.level || 'Bronze',
      rating: p.roles.includes('Designer') || p.roles.includes('Lab') ? ((profileData as any)?.rating || 5.0) : null
    });
    this.showLevelModal.set(true);
  }

  submitLevelUpdate(): void {
    const p = this.profile();
    if (!p) return;

    this.adminService.adminUpdateProfile(p.id, this.updateLevelForm()).subscribe({
      next: () => {
        this.toast.success('تم تحديث المستوى/التقييم بنجاح');
        this.showLevelModal.set(false);
        this.loadProfile(p.id);
      }
    });
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      Doctor: 'طبيب / عميل',
      Designer: 'مصمم / مختبر',
      Lab: 'مختبر',
      SuperAdmin: 'مشرف عام',
      FinancialAdmin: 'مشرف مالي',
      OperationsAdmin: 'مشرف عمليات',
      QualityAdmin: 'مشرف جودة',
    };
    return map[role] ?? role;
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      Doctor: 'bg-blue-50 text-blue-700 border-blue-200',
      Designer: 'bg-purple-50 text-purple-700 border-purple-200',
      Lab: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      SuperAdmin: 'bg-red-50 text-red-700 border-red-200',
      FinancialAdmin: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      OperationsAdmin: 'bg-amber-50 text-amber-700 border-amber-200',
      QualityAdmin: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    };
    return map[role] ?? 'bg-slate-50 text-slate-700 border-slate-200';
  }

  getTxTypeLabel(type: any): string {
    const map: Record<number, string> = {
      0: 'شحن رصيد',
      1: 'سداد فاتورة',
      2: 'استرداد',
      3: 'سحب أرباح',
      4: 'تسوية يدوية',
      5: 'إيداع طلب',
    };
    return map[Number(type)] ?? String(type);
  }

  // Badge color for the transaction TYPE (informational, not the credit/debit direction)
  getTxTypeClass(type: any): string {
    const t = Number(type);
    if (t === 0 || t === 2) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (t === 1 || t === 3) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (t === 4) return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  }

  // Bootstrap icon per transaction type
  getTxTypeIcon(type: any): string {
    const map: Record<number, string> = {
      0: 'bi-wallet2',
      1: 'bi-receipt',
      2: 'bi-arrow-counterclockwise',
      3: 'bi-cash-coin',
      4: 'bi-sliders',
      5: 'bi-box-seam',
    };
    return map[Number(type)] ?? 'bi-question-circle';
  }

  // Direction (Add / Deduct) is always driven by the actual balance movement
  // (afterBalance vs beforeBalance), never by `amount`'s sign — the API always
  // returns `amount` as a positive number regardless of whether it was a credit or debit.
  isCredit(tx: WalletTransactionDto): boolean {
    return Number(tx.afterBalance) >= Number(tx.beforeBalance);
  }

  // Actual signed movement for a transaction, derived from the balance delta.
  txDelta(tx: WalletTransactionDto): number {
    return Number(tx.afterBalance) - Number(tx.beforeBalance);
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }
}