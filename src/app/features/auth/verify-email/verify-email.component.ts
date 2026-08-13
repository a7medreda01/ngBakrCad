import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TokenService } from '../../../core/services/token.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
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
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly isSending = signal(false);
  readonly email = signal<string>('');
  readonly isDoctor = signal<boolean>(false);
  readonly isDesigner = signal<boolean>(false); // 👈 جديد

  form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
  });

  ngOnInit(): void {
    const queryEmail = this.route.snapshot.queryParams['email'];
    const currentUser = this.authService.currentUser();
  console.log('currentUser:', currentUser);
  console.log('currentUser roles:', currentUser?.roles);
  console.log('tokenService roles:', this.tokenService.getUserRoles());
    if (queryEmail) {
      this.email.set(queryEmail);
    } else if (currentUser) {
      this.email.set(currentUser.email);
    } else {
      this.router.navigate(['/auth/login']);
      return;
    }

    const roles = currentUser?.roles?.length ? currentUser.roles : this.tokenService.getUserRoles();

    if (roles.includes('Doctor')) {
      this.isDoctor.set(true);
    }
    if (roles.some((r: string) => ['Designer', 'Lab'].includes(r))) {
      this.isDesigner.set(true); // 👈 نلقط الدور من هنا، قبل ما الـ token يتغيّر
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
      next: (res) => {
          console.log('verifyEmail response:', res);
  console.log('roles from token after verify:', this.tokenService.getUserRoles());
        this.isLoading.set(false);
        this.toast.success(
          this.i18n.isRtl()
            ? 'تم تأكيد البريد الإلكتروني بنجاح!'
            : 'Email verified successfully!'
        );

        const roles = this.tokenService.getUserRoles();
        const responseRoles = Array.isArray(res?.roles) ? res.roles : [];

        const isDesignerFlow = this.isDesigner() // 👈 الاعتماد الأساسي بقى على الحالة اللي اتقاطت في ngOnInit
          || roles.some((r: string) => ['Designer', 'Lab'].includes(r))
          || responseRoles.some((r: string) => ['Designer', 'Lab'].includes(r));

        if (isDesignerFlow) {
          this.router.navigate(['/designer/application-status']);
          return;
        }

        if (this.isDoctor() || roles.includes('Doctor') || responseRoles.includes('Doctor')) {
          this.router.navigate(['/auth/verify-phone']);
          return;
        }

        if (roles.some((r: string) => ['SuperAdmin','FinancialAdmin','OperationsAdmin','QualityAdmin'].includes(r))
          || responseRoles.some((r: string) => ['SuperAdmin','FinancialAdmin','OperationsAdmin','QualityAdmin'].includes(r))) {
          this.router.navigate(['/admin/dashboard']);
          return;
        }

        if (roles.length === 0 && responseRoles.length === 0) {
          this.router.navigate(['/auth/login']);
          return;
        }

        this.router.navigate(['/client/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const lang = this.i18n.currentLang();
        const msg = lang === 'ar'
          ? (err.error?.messageAr || err.error?.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية')
          : (err.error?.messageEn || err.error?.message || 'Invalid or expired verification code');
        this.toast.error(msg);
      }
    });
  }

  resendCode(): void {
    this.isSending.set(true);
    this.authService.sendVerificationEmail(this.email()).subscribe({
      next: () => {
        this.isSending.set(false);
        this.toast.success(
          this.i18n.isRtl()
            ? 'تم إرسال رمز التحقق الجديد إلى بريدك الإلكتروني.'
            : 'A new verification code has been sent to your email.'
        );
      },
      error: (err) => {
        this.isSending.set(false);
        const lang = this.i18n.currentLang();
        const msg = lang === 'ar'
          ? (err.error?.messageAr || err.error?.message || 'فشل في إعادة إرسال الرمز.')
          : (err.error?.messageEn || err.error?.message || 'Failed to resend code.');
        this.toast.error(msg);
      }
    });
  }
}