import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-application-status',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './application-status.component.html'
})
export class ApplicationStatusComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly profile = signal<any | null>(null);
  readonly isEditing = signal(false);
  readonly selectedSpecializations = signal<string[]>([]);

  // نفس القائمة الموجودة في صفحة التسجيل بالظبط
  readonly specializationOptions = [
    { value: 'fixed-prosthodontics', labelAr: 'تركيبات ثابتة', labelEn: 'Fixed Prosthodontics Design' },
    { value: 'implant-prosthodontics', labelAr: 'تركيبات زراعة الأسنان', labelEn: 'Implant Prosthodontics & Custom Abutment Design' },
    { value: 'removable-prosthodontics', labelAr: 'تركيبات متحركة', labelEn: 'Removable Prosthodontics Design' },
    { value: 'orthodontics-preventive', labelAr: 'تقويم الأسنان والأجهزة الوقائية', labelEn: 'Orthodontics & Preventive Appliances Design' },
    { value: 'surgical-guides', labelAr: 'أدلة جراحية', labelEn: 'Guided Surgery & Surgical Stints Design' },
    { value: 'all-on-x', labelAr: 'All-on-X', labelEn: 'Full Arch Fixed Implant Rehabilitation Design' },
    { value: 'auxiliary-services', labelAr: 'خدمات تكميلية', labelEn: 'Auxiliary Dental Services & Digital Smile Design (DSD)' }
  ];

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    phoneNumber: ['', [Validators.required]],
    specialization: ['', [Validators.required]],
    portfolioUrl: ['']
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  private isApproved(profile: any): boolean {
    const approvalStatus = profile?.designerProfile?.approvalStatus;
    return approvalStatus === 'Approved' || profile?.designerProfile?.isApproved === true;
  }

  // يحاول يطابق نص التخصص المخزن (Ar/En) مع الـ values عشان يعلّم الاختيارات القديمة
  private matchSpecializationValues(specializationText: string | undefined | null): string[] {
    if (!specializationText) return [];
    return this.specializationOptions
      .filter(opt => specializationText.includes(opt.labelAr) || specializationText.includes(opt.labelEn))
      .map(opt => opt.value);
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.authService.loadUserProfile().subscribe({
      next: (res: any) => {
        this.profile.set(res);
        this.isLoading.set(false);

        const matchedValues = this.matchSpecializationValues(res?.designerProfile?.specialization);
        this.selectedSpecializations.set(matchedValues);

        // Populate form
        this.form.patchValue({
          fullName: res?.fullName || '',
          phoneNumber: res?.phoneNumber || '',
          specialization: res?.designerProfile?.specialization || '',
          portfolioUrl: res?.designerProfile?.portfolioUrl || ''
        });

        // Only approved designers can access the dashboard
        if (this.isApproved(res)) {
          this.router.navigate(['/lab/dashboard']);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  enableEdit(): void {
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    const res = this.profile();
    this.selectedSpecializations.set(this.matchSpecializationValues(res?.designerProfile?.specialization));
    this.form.patchValue({
      fullName: res?.fullName || '',
      phoneNumber: res?.phoneNumber || '',
      specialization: res?.designerProfile?.specialization || '',
      portfolioUrl: res?.designerProfile?.portfolioUrl || ''
    });
  }

  toggleSpecialization(value: string): void {
    const current = this.selectedSpecializations();
    const next = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];

    this.selectedSpecializations.set(next);
    this.form.get('specialization')?.setValue(this.getSelectedSpecializationText(next), { emitEvent: false });

    if (next.length > 0) {
      this.form.get('specialization')?.setErrors(null);
    } else {
      this.form.get('specialization')?.setErrors({ required: true });
    }
  }

  isSpecializationSelected(value: string): boolean {
    return this.selectedSpecializations().includes(value);
  }

  getSpecializationLabel(option: { value: string; labelAr: string; labelEn: string }): string {
    return this.i18n.currentLang() === 'ar' ? option.labelAr : option.labelEn;
  }

  private getSelectedSpecializationText(values: string[]): string {
    return values
      .map(value => this.specializationOptions.find(option => option.value === value))
      .filter((option): option is { value: string; labelAr: string; labelEn: string } => !!option)
      .map(option => this.getSpecializationLabel(option))
      .join(', ');
  }

  onSubmitResubmit(): void {
    const selectedText = this.getSelectedSpecializationText(this.selectedSpecializations());
    this.form.get('specialization')?.setValue(selectedText, { emitEvent: false });

    if (!selectedText.trim()) {
      this.form.get('specialization')?.setErrors({ required: true });
      this.form.get('specialization')?.markAsTouched();
    } else {
      this.form.get('specialization')?.setErrors(null);
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const data = this.form.getRawValue();

    this.adminService.resubmitDesignerApplication(data).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isEditing.set(false);
        this.toast.success(
          this.i18n.currentLang() === 'ar'
            ? 'تم إعادة إرسال طلب الانضمام بنجاح! سيتم مراجعته من قبل الإدارة.'
            : 'Application resubmitted successfully! It will be reviewed by administration.'
        );
        this.loadProfile();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.toast.error(
          err?.error?.message ||
          (this.i18n.currentLang() === 'ar' ? 'فشل إعادة إرسال الطلب.' : 'Failed to resubmit application.')
        );
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}