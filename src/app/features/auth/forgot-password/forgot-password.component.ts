import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly translationService = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly isSubmitted = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.authService.forgotPassword(this.form.getRawValue()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSubmitted.set(true);
        const successMsg = this.translationService.currentLang() === 'ar'
          ? 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.'
          : 'A password reset link has been sent to your email.';
        this.toast.success(successMsg);
      },
      error: (err) => {
        this.isLoading.set(false);
        const currentLang = this.translationService.currentLang();
        const errorMsg = currentLang === 'ar'
          ? (err.error?.messageAr || err.error?.message || 'حدث خطأ. يرجى المحاولة لاحقاً.')
          : (err.error?.messageEn || err.error?.message || 'An error occurred. Please try again later.');
        this.toast.error(errorMsg);
      }
    });
  }
}
