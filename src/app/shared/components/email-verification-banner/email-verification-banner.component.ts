import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { WalletService } from '../../../core/services/wallet.service';

@Component({
  selector: 'app-email-verification-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showBanner()) {
      <div class="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-500/10 border border-amber-500/20 px-6 py-3.5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 mb-6 shadow-sm animate-fade-in"
           [dir]="i18n.isRtl() ? 'rtl' : 'ltr'">
        <div class="flex items-center gap-3 text-center md:text-left">
          <span class="text-amber-600 p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </span>
          <div class="flex flex-col gap-0.5">
            <span class="text-xs font-black text-amber-900">
              {{ i18n.isRtl() ? 'بريدك الإلكتروني غير مؤكد!' : 'Your email address is not verified!' }}
            </span>
            <span class="text-[11px] text-amber-700 font-semibold leading-relaxed">
              @if (isDoctor()) {
                {{ i18n.isRtl()
                  ? 'قم بتأكيد حسابك الآن لتحصل تلقائياً على حد ائتماني بقيمة ' + welcomeBonus() + ' ريال لطلب الحالات والدفع لاحقاً.'
                  : 'Verify your email now and get ' + welcomeBonus() + ' SAR credit limit instantly.' }}
              } @else {
                {{ i18n.isRtl() ? 'قم بتأكيد حسابك لتلقي الإشعارات وتحديثات الطلبات مباشرة على بريدك.' : 'Confirm your account to receive important order updates directly in your inbox.' }}
              }
            </span>
          </div>
        </div>

        <button (click)="resendAndRedirect()" 
                [disabled]="isLoading()"
                class="px-5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50">
          {{ isLoading() ? (i18n.isRtl() ? 'جاري الإرسال...' : 'Sending...') : (i18n.isRtl() ? 'تأكيد البريد الآن' : 'Verify Email Now') }}
        </button>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class EmailVerificationBannerComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly walletService = inject(WalletService);
  readonly i18n = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly welcomeBonus = signal<string>('200');

  ngOnInit(): void {
    this.walletService.getPublicSetting('WelcomeBonusAmount').subscribe({
      next: (res: any) => {
        if (res?.value) this.welcomeBonus.set(String(res.value));
      },
      error: () => {}
    });
  }

  showBanner(): boolean {
    const user = this.auth.currentUser();
    return !!user && !user.isEmailVerified;
  }

  isDoctor(): boolean {
    const user = this.auth.currentUser();
    return !!user && user.roles.includes('Doctor');
  }

  resendAndRedirect(): void {
    const user = this.auth.currentUser();
    if (!user) return;

    this.isLoading.set(true);
    this.auth.sendVerificationEmail(user.email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success(this.i18n.isRtl()
          ? 'تم إرسال كود التحقق الجديد للبريد.'
          : 'A verification code has been sent to your email.');
        this.router.navigate(['/auth/verify-email'], { queryParams: { email: user.email } });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Failed to send verification email');
      }
    });
  }
}


