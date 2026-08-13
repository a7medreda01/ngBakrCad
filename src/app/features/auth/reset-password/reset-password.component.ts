import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly translationService = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  
  email = '';
  token = '';

  form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      this.token = params['token'] || '';
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.getRawValue();
    const currentLang = this.translationService.currentLang();
    if (val.newPassword !== val.confirmPassword) {
      const matchMsg = currentLang === 'ar' ? 'كلمة المرور غير متطابقة' : 'Passwords do not match';
      this.toast.error(matchMsg);
      return;
    }

    if (!this.email || !this.token) {
      const linkMsg = currentLang === 'ar' 
        ? 'رابط غير صالح. يرجى طلب رابط جديد لاستعادة كلمة المرور.' 
        : 'Invalid link. Please request a new link to restore password.';
      this.toast.error(linkMsg);
      return;
    }

    this.isLoading.set(true);
    this.authService.resetPassword({
      email: this.email,
      token: this.token,
      newPassword: val.newPassword
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        const successMsg = currentLang === 'ar'
          ? 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.'
          : 'Password has been reset successfully. You can log in now.';
        this.toast.success(successMsg);
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const errorMsg = currentLang === 'ar'
          ? (err.error?.messageAr || err.error?.message || 'فشل في إعادة تعيين كلمة المرور.')
          : (err.error?.messageEn || err.error?.message || 'Failed to reset password.');
        this.toast.error(errorMsg);
      }
    });
  }
}
