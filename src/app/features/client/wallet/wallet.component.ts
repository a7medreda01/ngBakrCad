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
  cardClass: string;
  badgeClass: string;
  buttonClass: string;
  icon: 'silver' | 'gold' | 'platinum' | 'diamond';
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
   * Visual tier based on paymentAmount range (1000 - 10000 SAR):
   *  < 1500        → Silver
   *  1500 - 3999   → Gold
   *  4000 - 6999   → Platinum
   *  7000+         → Diamond (best value, gets a highlighted "الأفضل قيمة" badge)
   */
  getPackageTier(pkg: DepositPackageDto): PackageTier {
    const amount = pkg.paymentAmount;

    if (amount >= 7000) {
      return {
        label: 'الأفضل قيمة',
        icon: 'diamond',
        cardClass: 'border-2 border-primary bg-gradient-to-br from-primary/5 to-transparent shadow-primary/20 shadow-lg scale-[1.02]',
        badgeClass: 'bg-primary text-white',
        buttonClass: 'bg-primary hover:bg-primary-dark text-white'
      };
    }
    if (amount >= 4000) {
      return {
        label: 'بلاتينية',
        icon: 'platinum',
        cardClass: 'border border-indigo-200 bg-gradient-to-br from-indigo-50 to-transparent',
        badgeClass: 'bg-indigo-100 text-indigo-700',
        buttonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white'
      };
    }
    if (amount >= 1500) {
      return {
        label: 'ذهبية',
        icon: 'gold',
        cardClass: 'border border-amber-200 bg-gradient-to-br from-amber-50 to-transparent',
        badgeClass: 'bg-amber-100 text-amber-700',
        buttonClass: 'bg-amber-500 hover:bg-amber-600 text-white'
      };
    }
    return {
      label: 'فضية',
      icon: 'silver',
      cardClass: 'border border-border bg-background/50',
      badgeClass: 'bg-slate-100 text-slate-600',
      buttonClass: 'bg-primary hover:bg-primary-dark text-white'
    };
  }

  getTransactionTypeLabel(type: number): string {
    const types: Record<number, string> = {
      0: 'شحن رصيد / إيداع',
      1: 'بونص ترويجي',
      2: 'سداد قيمة طلب',
      3: 'إرجاع / استرداد',
      4: 'تعديل يدوي من الإدارة',
      5: 'استخدام حد الائتمان',
      6: 'تسوية مديونية'
    };
    return types[type] ?? 'أخرى';
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}