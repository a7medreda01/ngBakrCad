import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(false);

  // --- جديد: معاينة فورية للصورة الشخصية وقت الرفع، من غير ما ننتظر رد السيرفر ---
  readonly previewPictureUrl = signal<string | null>(null);
  readonly isUploadingPicture = signal(false);
  private previewObjectUrl: string | null = null;

  readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    phoneNumber: ['', [Validators.required]],
    clinicName: [''],
    country: [''],
    city: [''],
    specialization: ['']
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    const profile = this.authService.userProfile();
    if (profile) {
      this.form.patchValue({
        fullName: profile.fullName,
        phoneNumber: profile.phoneNumber,
        clinicName: profile.clientProfile?.clinicName || '',
        country: profile.clientProfile?.country || '',
        city: profile.clientProfile?.city || '',
        specialization: profile.designerProfile?.specialization || ''
      });
    } else {
      this.authService.loadUserProfile().subscribe({
        next: (p) => {
          this.form.patchValue({
            fullName: p.fullName,
            phoneNumber: p.phoneNumber,
            clinicName: p.clientProfile?.clinicName || '',
            country: p.clientProfile?.country || '',
            city: p.clientProfile?.city || '',
            specialization: p.designerProfile?.specialization || ''
          });
        }
      });
    }
  }

  /**
   * --- معدّل: بعد اختيار الصورة، بنعرضها فورًا (Object URL) قبل حتى ما نبدأ الرفع،
   * عشان المستخدم يحس إن التحديث حصل على طول من غير ما ينتظر رد السيرفر.
   * وبعد نجاح الرفع، بنعمل refresh لبيانات البروفايل من السيرفر عشان أي مكون
   * تاني في التطبيق بيقرا authService.userProfile() ياخد الرابط الجديد الصحيح.
   * لو فشل الرفع، بنرجع نمسح المعاينة المؤقتة عشان ميفضلش شكل مضلل للمستخدم.
   * ---
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // نظّف أي object URL قديم قبل ما ننشئ واحد جديد عشان منعملش memory leak
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
    }
    this.previewObjectUrl = URL.createObjectURL(file);
    this.previewPictureUrl.set(this.previewObjectUrl);

    this.isUploadingPicture.set(true);
    this.authService.uploadProfilePicture(file).subscribe({
      next: () => {
        this.toast.success('تم تحديث الصورة الشخصية بنجاح');
        // تحديث بيانات البروفايل من السيرفر عشان الرابط النهائي (المستضاف) يبقى متزامن بعد كده
        this.authService.loadUserProfile().subscribe({
          next: () => this.isUploadingPicture.set(false),
          error: () => this.isUploadingPicture.set(false)
        });
      },
      error: () => {
        this.isUploadingPicture.set(false);
        this.toast.error('حدث خطأ أثناء رفع الصورة');
        // فشل الرفع: نرجع نمسح المعاينة المؤقتة ونرجع للصورة الأصلية
        if (this.previewObjectUrl) {
          URL.revokeObjectURL(this.previewObjectUrl);
          this.previewObjectUrl = null;
        }
        this.previewPictureUrl.set(null);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.authService.updateProfile(this.form.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('تم تحديث البيانات الشخصية بنجاح');
      },
      error: () => this.isLoading.set(false)
    });
  }

  readonly changePasswordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  readonly isChangingPassword = signal(false);

  onChangePasswordSubmit(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }
    const val = this.changePasswordForm.getRawValue();
    if (val.newPassword !== val.confirmPassword) {
      this.toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    this.isChangingPassword.set(true);
    this.authService.changePassword(val).subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        this.toast.success('تم تغيير كلمة المرور بنجاح');
        this.changePasswordForm.reset();
      },
      error: (err) => {
        this.isChangingPassword.set(false);
        this.toast.error(err.error?.message || 'حدث خطأ أثناء تغيير كلمة المرور');
      }
    });
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}