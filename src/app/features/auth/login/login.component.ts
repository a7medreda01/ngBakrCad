import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly translationService = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly showSessionConflictModal = signal(false);
  readonly conflictMessage = signal('');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(confirmLogoutOtherDevices = false): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    const payload = {
      ...this.form.getRawValue(),
      confirmLogoutOtherDevices
    };

    this.authService.login(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.showSessionConflictModal.set(false);

        const roles = res.roles;
        const isDoctorOrDesigner = roles.some(r => ['Doctor', 'Designer', 'Lab'].includes(r));

        if (isDoctorOrDesigner && !res.isEmailVerified) {
          this.toast.info(
            this.translationService.currentLang() === 'ar'
              ? 'يرجى تأكيد البريد الإلكتروني الخاص بك أولاً للمتابعة.'
              : 'Please verify your email address to continue.'
          );
          this.router.navigate(['/auth/verify-email'], { queryParams: { email: res.email } });
          return;
        }

        // Role-based redirect
        if (roles.some(r => ['SuperAdmin','FinancialAdmin','OperationsAdmin','QualityAdmin'].includes(r))) {
          this.router.navigate(['/admin/dashboard']);
        } else if (roles.includes('Designer')) {
          this.authService.loadUserProfile().subscribe({
            next: (profile) => {
              if (profile?.designerProfile?.approvalStatus === 'Approved' || profile?.designerProfile?.isApproved) {
                this.router.navigate(['/lab/dashboard']);
              } else {
                this.router.navigate(['/designer/application-status']);
              }
            },
            error: () => {
              this.router.navigate(['/designer/application-status']);
            }
          });
        } else {
          this.router.navigate(['/client/dashboard']);
        }
      },
      error: (err) => { 
        this.isLoading.set(false);
        const currentLang = this.translationService.currentLang();
        const errorMsg = currentLang === 'ar'
          ? (err.error?.messageAr || err.error?.message || 'فشل تسجيل الدخول. يرجى التحقق من البيانات.')
          : (err.error?.messageEn || err.error?.message || 'Login failed. Please check your credentials.');
        if (errorMsg.includes('SESSION_CONFLICT')) {
          this.conflictMessage.set(errorMsg.replace('SESSION_CONFLICT: ', ''));
          this.showSessionConflictModal.set(true);
        } else if (errorMsg.includes('DESIGNER_PENDING_APPROVAL')) {
          const cleanMsg = currentLang === 'ar'
            ? 'طلب انضمامك كـ مصمم قيد المراجعة والاعتماد حالياً من قبل الإدارة.'
            : 'Your designer join request is currently under review by administration.';
          this.toast.warning(cleanMsg);
        } else {
          this.toast.error(errorMsg);
        }
      }
    });
  }

  confirmSessionOverride(): void {
    this.onSubmit(true);
  }

  cancelSessionOverride(): void {
    this.showSessionConflictModal.set(false);
  }
}
