import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WalletService } from '../../../core/services/wallet.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { DepositPackageDto, WalletTransactionDto, PagedResultDto, WalletDto } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

interface PackageTier {
  label: string;
  /** Full gradient background + border + shadow for the "membership card" */
  cardClass: string;
  /** Base text color for headings/labels on this card */
  textClass: string;
  /** Muted/secondary text color on this card (opacity variant of textClass) */
  mutedTextClass: string;
  /** Translucent detail panel background */
  panelClass: string;
  /** Call-to-action button style */
  buttonClass: string;
  /** CSS filter classes applied to the /logo.png so it reads well on this card's background */
  logoFilterClass: string;
  icon: 'silver' | 'gold' | 'platinum' | 'diamond' | 'trial';
  /** Text shown in the floating ribbon above the card, if any */
  ribbon?: string;
  ribbonClass?: string;
}

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss'
})
export class WalletComponent implements OnInit {
  private readonly walletService = inject(WalletService);
  readonly authService = inject(AuthService);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly isLoadingTransactions = signal(false);
  readonly purchasingPackageId = signal<string | null>(null);
  readonly packages = signal<DepositPackageDto[]>([]);
  readonly transactions = signal<WalletTransactionDto[]>([]);

  /**
   * Shown at the top of every package "membership card", mirroring how
   * "DISNEYLAND® PASS" appears on the reference cards. Replace with your
   * actual product/brand name (or wire it up to an i18n key / app config).
   */
  readonly platformName = 'باقة شحن المحفظة';

  /** True once /logo.png has failed to load, so we fall back to text */
  readonly logoLoadFailed = signal(false);

  onLogoError(): void {
    this.logoLoadFailed.set(true);
  }

  // Transaction types that always ADD to the wallet balance,
  // regardless of the sign stored on tx.amount.
  private readonly creditTypesByNumber = new Set<number>([0, 1, 3]); // Deposit, Bonus, Refund
  private readonly creditTypesByName = new Set<string>(['Deposit', 'Bonus', 'Refund']);

  // Transaction types that always SUBTRACT from the wallet balance.
  private readonly debitTypesByNumber = new Set<number>([2, 5]); // OrderPayment, CreditUsage
  private readonly debitTypesByName = new Set<string>(['OrderPayment', 'CreditUsage']);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const sessionId = params['session_id'] as string | undefined;

      if (params['status'] === 'success') {
        if (sessionId) {
          this.confirmStripeCheckout(sessionId);
        } else {
          this.toast.success('تم إرسال عملية الدفع بنجاح. سيتم تحديث الرصيد فور تأكيدها.');
          this.refreshWalletData();
          this.clearCheckoutQueryParams();
        }
      } else if (params['status'] === 'cancel') {
        this.toast.error('تم إلغاء عملية الدفع.');
        this.clearCheckoutQueryParams();
      }
    });

    this.loadPackages();
    this.loadTransactions();
    this.authService.loadUserProfile().subscribe();
  }

  private confirmStripeCheckout(sessionId: string): void {
    this.walletService.confirmCheckoutSession(sessionId).subscribe({
      next: () => {
        this.toast.success('تم شحن المحفظة بنجاح!');
        this.refreshWalletData();
        this.clearCheckoutQueryParams();
      },
      error: () => {
        this.toast.error('تعذر تأكيد عملية الدفع. إذا تم خصم المبلغ، تواصل مع الدعم.');
        this.refreshWalletData();
        this.clearCheckoutQueryParams();
      }
    });
  }

  private refreshWalletData(): void {
    this.authService.loadUserProfile().subscribe();
    this.loadTransactions();
  }

  private clearCheckoutQueryParams(): void {
    this.router.navigate([], {
      queryParams: { status: null, session_id: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  loadPackages(): void {
    this.isLoading.set(true);
    this.walletService.getAvailablePackages().subscribe({
      next: (res) => {
        this.packages.set(
          res
            .filter(p => p.isActive)
            .sort((a, b) => a.paymentAmount - b.paymentAmount)
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('تعذر تحميل باقات الشحن، حاول مرة أخرى');
      }
    });
  }

  loadTransactions(): void {
    const userId = this.authService.currentUser()?.userId;
    if (!userId) {
      return;
    }
    this.isLoadingTransactions.set(true);
    this.walletService.getTransactions(userId).subscribe({
      next: (res) => {
        this.transactions.set(res.items ?? []);
        this.isLoadingTransactions.set(false);
      },
      error: () => {
        this.isLoadingTransactions.set(false);
        this.toast.error('تعذر تحميل الحركات المالية');
      }
    });
  }

  purchasePackage(pkg: DepositPackageDto): void {
    if (this.purchasingPackageId()) {
      return;
    }
    this.purchasingPackageId.set(pkg.id);
    this.walletService.purchasePackage(pkg.id).subscribe({
      next: (res: any) => {
        // Backend now returns the Stripe Checkout URL
        if (res && res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          // Fallback if no url
          this.toast.success(`تم شحن المحفظة بنجاح بمبلغ ${pkg.walletCreditAmount} SAR`);
          this.authService.loadUserProfile().subscribe();
          this.loadTransactions();
          this.purchasingPackageId.set(null);
        }
      },
      error: () => {
        this.purchasingPackageId.set(null);
        this.toast.error('تعذر إتمام عملية الشحن، حاول مرة أخرى');
      }
    });
  }

  /**
   * Visual tier for a package, styled as a premium "membership card" that
   * follows the BKRCAD brand system: Medical Blue / Navy as the single base
   * hue across every tier, White for contrast, and a Gold accent reserved
   * for emphasis (ribbons, borders, CTA on the darkest cards). Tiers are no
   * longer differentiated by hue (bronze/gold/silver/pink/navy) — they are
   * differentiated by the DEPTH of the same navy gradient and by how much
   * gold accent is introduced, so all five cards read as one product family.
   *
   * Priority order:
   *  1. Free trial (paymentAmount === 0) → lightest card in the family
   *     (white/sky tint, navy text, gold ribbon) — clearly "entry level"
   *     without breaking the palette.
   *  2. Explicit tier keyword found in the package's own name (Platinum/
   *     Gold/Silver/Diamond/Enterprise, or Arabic equivalents) — source of
   *     truth, since names are set deliberately when configuring packages.
   *  3. Fallback: payment-amount thresholds, only when the name gives no hint.
   */
  getPackageTier(pkg: DepositPackageDto): PackageTier {
    return {
      label: 'باقة شحن',
      icon: 'silver',
      cardClass: 'bg-gradient-to-br from-slate-900 via-secondary to-primary-900 border border-primary/30 shadow-xl text-white',
      textClass: 'text-white',
      mutedTextClass: 'text-white/80',
      panelClass: 'bg-white/10 border border-white/15 backdrop-blur-sm shadow-inner',
      buttonClass: 'bg-primary hover:bg-primary-dark text-white font-bold',
      logoFilterClass: 'brightness-0 invert opacity-90'
    };
  }

  getTransactionTypeLabel(type: number | string): string {
    const typesByNumber: Record<number, string> = {
      0: 'شحن رصيد / إيداع',
      1: 'بونص ترويجي',
      2: 'سداد قيمة طلب',
      3: 'إرجاع / استرداد',
      4: 'تعديل يدوي من الإدارة',
      5: 'استخدام حد الائتمان',
      6: 'تسوية مديونية'
    };

    const typesByName: Record<string, string> = {
      Deposit: 'شحن رصيد / إيداع',
      Bonus: 'بونص ترويجي',
      OrderPayment: 'سداد قيمة طلب',
      Refund: 'إرجاع / استرداد',
      ManualAdjustment: 'تعديل يدوي من الإدارة',
      CreditUsage: 'استخدام حد الائتمان',
      CreditSettlement: 'تسوية مديونية'
    };

    if (typeof type === 'string') {
      const numericType = Number(type);
      if (!Number.isNaN(numericType)) {
        return typesByNumber[numericType] ?? 'أخرى';
      }
      return typesByName[type] ?? 'أخرى';
    }

    return typesByNumber[type] ?? 'أخرى';
  }

  /**
   * Determines whether a transaction increased the wallet balance (credit)
   * or decreased it (debit). The API returns tx.amount as an unsigned
   * magnitude, so direction must be derived from tx.type for known types.
   * For ambiguous types (ManualAdjustment, CreditSettlement) we fall back
   * to comparing beforeBalance/afterBalance, and finally to the raw sign
   * of tx.amount as a last resort.
   */
  isCredit(tx: WalletTransactionDto): boolean {
    const type = tx.type as number | string;

    if (typeof type === 'number') {
      if (this.creditTypesByNumber.has(type)) return true;
      if (this.debitTypesByNumber.has(type)) return false;
    } else {
      const numericType = Number(type);
      if (!Number.isNaN(numericType)) {
        if (this.creditTypesByNumber.has(numericType)) return true;
        if (this.debitTypesByNumber.has(numericType)) return false;
      } else {
        if (this.creditTypesByName.has(type)) return true;
        if (this.debitTypesByName.has(type)) return false;
      }
    }

    // Ambiguous type (ManualAdjustment / CreditSettlement): infer from balances if available
    if (typeof tx.beforeBalance === 'number' && typeof tx.afterBalance === 'number') {
      return tx.afterBalance >= tx.beforeBalance;
    }

    // Last resort: raw amount sign
    return (tx.amount ?? 0) >= 0;
  }

  absAmount(tx: WalletTransactionDto): number {
    return Math.abs(tx.amount ?? 0);
  }

  /**
   * Formats a transaction date as "day name، time" (e.g. "اليوم، 7:17 م" /
   * "أمس، 3:00 م" / "الثلاثاء، 11:45 ص") instead of a raw yyyy-MM-dd
   * timestamp, per design request.
   */
  formatTransactionDate(value: string | Date): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

    const time = new Intl.DateTimeFormat('ar-SA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);

    let dayLabel: string;
    if (diffDays === 0) {
      dayLabel = 'اليوم';
    } else if (diffDays === 1) {
      dayLabel = 'أمس';
    } else if (diffDays > 1 && diffDays < 7) {
      dayLabel = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(date);
    } else {
      dayLabel = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short' }).format(date);
    }

    return `${dayLabel}، ${time}`;
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }

}