import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { UserRole } from '../../../core/enums';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, ButtonComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly translationService = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly showPassword = signal(false);

  // Account type selection: 'client' (Doctor=4) or 'lab' (Designer=6)
  readonly selectedType = signal<'client' | 'lab'>('client');

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    clinicName: [''],
    country: ['Saudi Arabia'],
    city: [''],
    specialization: ['']
  });

  selectType(type: 'client' | 'lab'): void {
    this.selectedType.set(type);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);

    const role = this.selectedType() === 'client' ? UserRole.Doctor : UserRole.Designer;
    const payload = { ...this.form.getRawValue(), role };

    this.authService.register(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const roles = res.roles;
        if (roles.includes('Designer')) {
          this.router.navigate(['/lab/dashboard']);
        } else {
          this.router.navigate(['/client/dashboard']);
        }
      },
      error: (err) => { 
        this.isLoading.set(false);
        const errorMsg = err.error?.message || 'Registration failed. Please try again.';
        this.toast.error(errorMsg);
      }
    });
  }
}
