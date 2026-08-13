import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-email-verification-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showBanner()) {
      <div class="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-500/10 border border-amber-500/20 px-4 sm:px-6 py-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shadow-sm animate-fade-in"
           [dir]="i18n.isRtl() ? 'rtl' : 'ltr'">
        <div class="flex items-start gap-3 w-full md:w-auto">
          <span class="text-amber-600 p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </span>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-xs font-black text-amber-900">
              {{ i18n.isRtl() ? 'بريدك الإلكتروني غير مؤكد!' : 'Your email address is not verified!' }}
            </span>
            <span class="text-[11px] text-amber-700 font-semibold leading-relaxed">
              {{ i18n.isRtl() ? 'قم بتأكيد حسابك لتلقي الإشعارات وتحديثات الطلبات مباشرة على بريدك.' : 'Confirm your account to receive important order updates directly in your inbox.' }}
            </span>
          </div>
        </div>

        <button (click)="resendAndRedirect()" 
                [disabled]="isLoading()"
                class="w-full md:w-auto px-5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 flex-shrink-0">
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
export class EmailVerificationBannerComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(TranslationService);

  readonly isLoading = signal(false);

  showBanner(): boolean {
    const user = this.auth.currentUser();
    return !!user && !user.isEmailVerified;
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