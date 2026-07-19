import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { WalletService } from '../../../core/services/wallet.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly walletService = inject(WalletService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly isSending = signal(false);
  readonly email = signal<string>('');

  readonly isDoctor = signal<boolean>(false);
  readonly welcomeBonus = signal<string>('200');

  form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
  });

  ngOnInit(): void {
    // Fetch dynamic welcome bonus
    this.walletService.getPublicSetting('WelcomeBonusAmount').subscribe({
      next: (res: any) => {
        if (res && res.value) {
          this.welcomeBonus.set(res.value);
        }
      },
      error: () => {}
    });

    // Attempt to get email from query params or current user signal
    const queryEmail = this.route.snapshot.queryParams['email'];
    const currentUser = this.authService.currentUser();

    if (queryEmail) {
      this.email.set(queryEmail);
    } else if (currentUser) {
      this.email.set(currentUser.email);
    } else {
      // If no email, redirect back to login
      this.router.navigate(['/auth/login']);
      return;
    }

    if (currentUser) {
      this.isDoctor.set(currentUser.roles.includes('Doctor'));
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const code = this.form.getRawValue().code;

    this.authService.verifyEmail(this.email(), code).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        
        let successMsg = this.i18n.isRtl() 
          ? 'تم تأكيد البريد الإلكتروني بنجاح!' 
          : 'Email verified successfully!';
        
        if (res.isDoctorCreditGranted) {
          successMsg += this.i18n.isRtl()
            ? ` وحصلت على حد ائتماني بقيمة ${res.creditGranted} ريال.`
            : ` You received a credit limit of ${res.creditGranted} SAR.`;
        }

        this.toast.success(successMsg);

        // Redirect based on roles
        const currentUser = this.authService.currentUser();
        if (currentUser) {
          const roles = currentUser.roles;
          if (roles.some(r => ['SuperAdmin','FinancialAdmin','OperationsAdmin','QualityAdmin'].includes(r))) {
            this.router.navigate(['/admin/dashboard']);
          } else if (roles.includes('Designer')) {
            this.router.navigate(['/lab/dashboard']);
          } else {
            this.router.navigate(['/client/dashboard']);
          }
        } else {
          this.router.navigate(['/auth/login']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || (this.i18n.isRtl() ? 'رمز التحقق غير صحيح أو منتهي الصلاحية' : 'Invalid or expired verification code'));
      }
    });
  }

  resendCode(): void {
    this.isSending.set(true);
    this.authService.sendVerificationEmail(this.email()).subscribe({
      next: () => {
        this.isSending.set(false);
        this.toast.success(this.i18n.isRtl() 
          ? 'تم إرسال رمز التحقق الجديد إلى بريدك الإلكتروني.' 
          : 'A new verification code has been sent to your email.');
      },
      error: (err) => {
        this.isSending.set(false);
        this.toast.error(err.error?.message || 'Failed to resend code');
      }
    });
  }
}
