import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { WalletService } from '../../../core/services/wallet.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-verify-phone',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent],
  templateUrl: './verify-phone.component.html',
  styleUrl: './verify-phone.component.scss'
})
export class VerifyPhoneComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly toast       = inject(ToastService);
  readonly i18n                = inject(TranslationService);
  private readonly walletSvc   = inject(WalletService);

  readonly isLoading   = signal(false);
  readonly isSending   = signal(false);
  readonly isSmsSent   = signal(false);
  readonly phoneHint   = signal<string>('');
  readonly isDoctor    = signal<boolean>(false);
  readonly welcomeBonus = signal<string>('200');

  form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
  });

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Already verified — skip to dashboard
    if (currentUser.isPhoneVerified) {
      this.navigateToDashboard(currentUser.roles);
      return;
    }

    this.isDoctor.set(currentUser.roles.includes('Doctor'));

    // Show masked phone hint from profile
    const profile = this.authService.userProfile();
    if (profile) {
      const phone = (profile as any).phoneNumber || '';
      this.phoneHint.set(this.maskPhone(phone));
    }

    // Fetch dynamic welcome bonus amount
    this.walletSvc.getPublicSetting('WelcomeBonusAmount').subscribe({
      next: (res: any) => { if (res?.value) this.welcomeBonus.set(res.value); },
      error: () => {}
    });

    // Auto-send OTP on page load
    this.sendCode();
  }

  sendCode(): void {
    this.isSending.set(true);
    this.authService.sendPhoneVerification().subscribe({
      next: () => {
        this.isSending.set(false);
        this.isSmsSent.set(true);
        this.toast.success(
          this.i18n.isRtl()
            ? 'تم إرسال رمز التحقق إلى رقم هاتفك.'
            : 'Verification code sent to your phone.'
        );
      },
      error: (err) => {
        this.isSending.set(false);
        const lang = this.i18n.currentLang();
        const msg = lang === 'ar'
          ? (err.error?.messageAr || err.error?.message || 'فشل إرسال الرسالة النصية.')
          : (err.error?.messageEn || err.error?.message || 'Failed to send SMS.');
        this.toast.error(msg);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const code = this.form.getRawValue().code;

    this.authService.verifyPhone(code).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);

        let msg = this.i18n.isRtl()
          ? 'تم تأكيد رقم هاتفك بنجاح!'
          : 'Phone number verified successfully!';

        if (res?.isDoctorCreditGranted) {
          msg += this.i18n.isRtl()
            ? ` حصلت على حد ائتماني بقيمة ${res.creditGranted} ريال.`
            : ` You received a credit limit of ${res.creditGranted} SAR.`;
        }

        this.toast.success(msg);

        const currentUser = this.authService.currentUser();
        this.navigateToDashboard(currentUser?.roles ?? []);
      },
      error: (err) => {
        this.isLoading.set(false);
        const lang = this.i18n.currentLang();
        const msg = lang === 'ar'
          ? (err.error?.messageAr || err.error?.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.')
          : (err.error?.messageEn || err.error?.message || 'Invalid or expired verification code.');
        this.toast.error(msg);
      }
    });
  }

  skipForNow(): void {
    const currentUser = this.authService.currentUser();
    this.navigateToDashboard(currentUser?.roles ?? []);
  }

  private navigateToDashboard(roles: string[]): void {
    if (roles.some(r => ['SuperAdmin','FinancialAdmin','OperationsAdmin','QualityAdmin'].includes(r))) {
      this.router.navigate(['/admin/dashboard']);
    } else if (roles.includes('Designer')) {
      this.router.navigate(['/lab/dashboard']);
    } else {
      this.router.navigate(['/client/dashboard']);
    }
  }

  private maskPhone(phone: string): string {
    if (!phone || phone.length <= 4) return '****';
    return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
  }
}
