import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
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
    if (val.newPassword !== val.confirmPassword) {
      this.toast.error('كلمة المرور غير متطابقة');
      return;
    }

    if (!this.email || !this.token) {
      this.toast.error('رابط غير صالح. يرجى طلب رابط جديد لاستعادة كلمة المرور.');
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
        this.toast.success('تم إعادة تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.');
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'فشل في إعادة تعيين كلمة المرور.');
      }
    });
  }
}
