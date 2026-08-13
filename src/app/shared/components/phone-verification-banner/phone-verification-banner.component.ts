import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { WalletService } from '../../../core/services/wallet.service';

@Component({
  selector: 'app-phone-verification-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showBanner()) {
      <div class="bg-gradient-to-r from-emerald-500/10 via-emerald-600/10 to-emerald-500/10 border border-emerald-500/20 px-4 sm:px-6 py-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shadow-sm animate-fade-in"
           [dir]="i18n.isRtl() ? 'rtl' : 'ltr'">
        <div class="flex items-start gap-3 w-full md:w-auto">
          <span class="text-emerald-600 p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15h3" />
            </svg>
          </span>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-xs font-black text-emerald-900">
              {{ i18n.isRtl() ? 'رقم هاتفك غير مؤكد!' : 'Your phone number is not verified!' }}
            </span>
            <span class="text-[11px] text-emerald-700 font-semibold leading-relaxed">
              {{ i18n.isRtl()
                ? 'قم بتأكيد حسابك الآن لتحصل تلقائياً على حد ائتماني بقيمة ' + welcomeBonus() + ' ريال لطلب الحالات والدفع لاحقاً.'
                : 'Verify your phone now and get ' + welcomeBonus() + ' SAR credit limit instantly.' }}
            </span>
          </div>
        </div>

        <button (click)="redirect()" 
                class="w-full md:w-auto px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm flex-shrink-0">
          {{ i18n.isRtl() ? 'تأكيد الهاتف الآن' : 'Verify Phone Now' }}
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
export class PhoneVerificationBannerComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly walletService = inject(WalletService);
  readonly i18n = inject(TranslationService);

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
    // Only show if email is verified, phone is NOT verified, and user is a Doctor
    return !!user && user.isEmailVerified && !user.isPhoneVerified && user.roles.includes('Doctor');
  }

  redirect(): void {
    this.router.navigate(['/auth/verify-phone']);
  }
}
