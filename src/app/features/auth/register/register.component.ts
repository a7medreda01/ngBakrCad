import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { UserRole } from '../../../core/enums';

import { CountrySelectComponent, Country, COUNTRIES_DATA, DEFAULT_PHONE_LENGTH } from '../../../shared/components/country-select/country-select.component';

/** يتحقق أن رقم الموبايل أرقام فقط وطوله ضمن حدود الدولة المختارة */
function phoneLengthValidator(getCountry: () => Country | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = (control.value || '').toString().trim();
    if (!value) return null; // required يتكفل بحالة الفراغ

    if (!/^[0-9]+$/.test(value)) {
      return { phoneDigitsOnly: true };
    }

    const country = getCountry();
    const min = country?.phoneMin ?? DEFAULT_PHONE_LENGTH.phoneMin;
    const max = country?.phoneMax ?? DEFAULT_PHONE_LENGTH.phoneMax;

    if (value.length < min || value.length > max) {
      return { phoneLength: { min, max, actual: value.length } };
    }

    return null;
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe, ButtonComponent, CountrySelectComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly translationService = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly selectedSpecializations = signal<string[]>([]);

  /** الدولة المختارة حاليًا (تحمل رمز الاتصال وحدود طول الرقم) */
  readonly selectedCountryData = signal<Country>(COUNTRIES_DATA[0]);

  readonly specializationOptions = [
    { value: 'fixed-prosthodontics', labelAr: 'تركيبات ثابتة', labelEn: 'Fixed Prosthodontics Design' },
    { value: 'implant-prosthodontics', labelAr: 'تركيبات زراعة الأسنان', labelEn: 'Implant Prosthodontics & Custom Abutment Design' },
    { value: 'removable-prosthodontics', labelAr: 'تركيبات متحركة', labelEn: 'Removable Prosthodontics Design' },
    { value: 'orthodontics-preventive', labelAr: 'تقويم الأسنان والأجهزة الوقائية', labelEn: 'Orthodontics & Preventive Appliances Design' },
    { value: 'surgical-guides', labelAr: 'أدلة جراحية', labelEn: 'Guided Surgery & Surgical Stints Design' },
    { value: 'all-on-x', labelAr: 'All-on-X', labelEn: 'Full Arch Fixed Implant Rehabilitation Design' },
    { value: 'auxiliary-services', labelAr: 'خدمات تكميلية', labelEn: 'Auxiliary Dental Services & Digital Smile Design (DSD)' }
  ];

  // Account type selection: 'client' (Doctor=4) or 'lab' (Designer=6)
  readonly selectedType = signal<'client' | 'lab'>('client');

  constructor() {
    if (this.route.snapshot.queryParamMap.get('type') === 'designer') {
      this.selectedType.set('lab');
    }
  }

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
    country: ['Saudi Arabia'],
    phoneNumber: ['', [Validators.required, phoneLengthValidator(() => this.selectedCountryData())]],
    city: ['', [Validators.required]],
    clinicName: [''],
    specialization: [''],
    portfolioUrl: [''],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
    ]]
  });

  /** يُستدعى من app-country-select عند تغيير الدولة */
  onCountryChange(country: Country): void {
    this.selectedCountryData.set(country);
    const phoneControl = this.form.get('phoneNumber');
    // نعيد تفعيل التحقق برقم الطول الجديد فورًا
    phoneControl?.updateValueAndValidity();
  }

  /** الرقم الكامل (رمز الدولة + الرقم المحلي) لعرضه أو إرساله للـ API */
  get fullPhoneNumber(): string {
    const local = (this.form.get('phoneNumber')?.value || '').toString().trim();
    return local ? `${this.selectedCountryData().dialCode}${local}` : '';
  }

  getEmailErrorMessage(): string {
    const emailControl = this.form.get('email');
    if (!emailControl || !emailControl.touched) {
      return '';
    }

    if (emailControl.hasError('required')) {
      return this.translationService.currentLang() === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    }

    if (emailControl.hasError('email') || emailControl.hasError('pattern')) {
      return this.translationService.currentLang() === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address';
    }

    return '';
  }

  getPhoneErrorMessage(): string {
    const phoneControl = this.form.get('phoneNumber');
    if (!phoneControl || !phoneControl.touched) {
      return '';
    }
    const isAr = this.translationService.currentLang() === 'ar';

    if (phoneControl.hasError('required')) {
      return isAr ? 'رقم الموبايل مطلوب' : 'Phone number is required';
    }

    if (phoneControl.hasError('phoneDigitsOnly')) {
      return isAr ? 'يرجى إدخال أرقام فقط' : 'Please enter digits only';
    }

    if (phoneControl.hasError('phoneLength')) {
      const { min, max } = phoneControl.getError('phoneLength');
      if (min === max) {
        return isAr
          ? `رقم الموبايل لدولة ${this.selectedCountryData().nameAr} يجب أن يكون ${min} أرقام`
          : `Phone number for ${this.selectedCountryData().nameEn} must be ${min} digits`;
      }
      return isAr
        ? `رقم الموبايل لدولة ${this.selectedCountryData().nameAr} يجب أن يكون بين ${min} و ${max} أرقام`
        : `Phone number for ${this.selectedCountryData().nameEn} must be between ${min} and ${max} digits`;
    }

    return '';
  }

  getCityErrorMessage(): string {
    const cityControl = this.form.get('city');
    if (!cityControl || !cityControl.touched) {
      return '';
    }
    if (cityControl.hasError('required')) {
      return this.translationService.currentLang() === 'ar' ? 'المدينة مطلوبة' : 'City is required';
    }
    return '';
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.form.get('password');
    if (!passwordControl || !passwordControl.touched) {
      return '';
    }

    if (passwordControl.hasError('required')) {
      return this.translationService.currentLang() === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required';
    }

    if (passwordControl.hasError('minlength')) {
      return this.translationService.currentLang() === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters';
    }

    if (passwordControl.hasError('pattern')) {
      return this.translationService.currentLang() === 'ar'
        ? 'يجب أن تحتوي كلمة المرور على حرف كبير، حرف صغير، رقم، ورمز خاص واحد على الأقل'
        : 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    return '';
  }

  selectType(type: 'client' | 'lab'): void {
    this.selectedType.set(type);
  }

  toggleSpecialization(value: string): void {
    const current = this.selectedSpecializations();
    const next = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];

    this.selectedSpecializations.set(next);
    this.form.get('specialization')?.setValue(this.getSelectedSpecializationText(next), { emitEvent: false });

    if (this.selectedType() === 'lab') {
      if (next.length > 0) {
        this.form.get('specialization')?.setErrors(null);
      } else {
        this.form.get('specialization')?.setErrors({ required: true });
      }
    }
  }

  isSpecializationSelected(value: string): boolean {
    return this.selectedSpecializations().includes(value);
  }

  getSpecializationLabel(option: { value: string; labelAr: string; labelEn: string }): string {
    return this.translationService.currentLang() === 'ar' ? option.labelAr : option.labelEn;
  }

  private getSelectedSpecializationText(values: string[]): string {
    return values
      .map(value => this.specializationOptions.find(option => option.value === value))
      .filter((option): option is { value: string; labelAr: string; labelEn: string } => !!option)
      .map(option => this.getSpecializationLabel(option))
      .join(', ');
  }

  onSubmit(): void {
    const selectedSpecializations = this.getSelectedSpecializationText(this.selectedSpecializations());
    this.form.get('specialization')?.setValue(selectedSpecializations, { emitEvent: false });

    if (this.selectedType() === 'lab' && !selectedSpecializations.trim()) {
      this.form.get('specialization')?.setErrors({ required: true });
      this.form.get('specialization')?.markAsTouched();
    } else {
      this.form.get('specialization')?.setErrors(null);
    }

    // نتأكد من إعادة تقييم الموبايل بأحدث بيانات دولة قبل الفحص
    this.form.get('phoneNumber')?.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);

    const role = this.selectedType() === 'client' ? UserRole.Doctor : UserRole.Designer;
    const rawValue = this.form.getRawValue();

    // دمج رمز الدولة مع الرقم المحلي قبل الإرسال للـ API
    const payload = {
      ...rawValue,
      phoneNumber: `${this.selectedCountryData().dialCode}${rawValue.phoneNumber}`,
      role
    };

    this.authService.register(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (!res.isEmailVerified) {
          this.toast.info(
            this.translationService.currentLang() === 'ar'
              ? 'تم تسجيل حسابك بنجاح! يرجى تأكيد البريد الإلكتروني للمتابعة.'
              : 'Registration successful! Please verify your email to continue.'
          );
          this.router.navigate(['/auth/verify-email'], { queryParams: { email: res.email } });
          return;
        }

        const roles = res.roles;
        if (roles.includes('Designer')) {
          this.router.navigate(['/designer/application-status']);
        } else {
          this.router.navigate(['/client/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const currentLang = this.translationService.currentLang();
        const errorMsg = currentLang === 'ar'
          ? (err.error?.messageAr || err.error?.message || 'فشلت عملية إنشاء الحساب. يرجى المحاولة مرة أخرى.')
          : (err.error?.messageEn || err.error?.message || 'Registration failed. Please try again.');
        this.toast.error(errorMsg);
      }
    });
  }
}