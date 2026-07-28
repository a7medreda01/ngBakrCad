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
        // Role-based redirect
        const roles = res.roles;
        if (roles.some(r => ['SuperAdmin','FinancialAdmin','OperationsAdmin','QualityAdmin'].includes(r))) {
          this.router.navigate(['/admin/dashboard']);
        } else if (roles.includes('Designer')) {
          this.router.navigate(['/lab/dashboard']);
        } else {
          this.router.navigate(['/client/dashboard']);
        }
      },
      error: (err) => { 
        this.isLoading.set(false);
        const errorMsg = err.error?.message || 'Login failed. Please check your credentials.';
        if (errorMsg.includes('SESSION_CONFLICT')) {
          this.conflictMessage.set(errorMsg.replace('SESSION_CONFLICT: ', ''));
          this.showSessionConflictModal.set(true);
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
