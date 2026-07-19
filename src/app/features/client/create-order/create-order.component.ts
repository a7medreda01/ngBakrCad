import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { OrderService } from '../../../core/services/order.service';
import { CatalogService } from '../../../core/services/catalog-service.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ServiceDto, OrderCreateRequest } from '../../../core/models';
import { OdontogramComponent } from '../../../shared/components/odontogram/odontogram.component';
import { FileUploaderComponent } from '../../../shared/ui/file-uploader/file-uploader.component';
import { ToastService } from '../../../core/services/toast.service';

export interface FileUploadState {
  file: File;
  progress: number;  // 0-100
  status: 'pending' | 'uploading' | 'done' | 'error';
}

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OdontogramComponent, FileUploaderComponent],
  templateUrl: './create-order.component.html',
  styleUrl: './create-order.component.scss'
})
export class CreateOrderComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly catalogService = inject(CatalogService);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(false);
  readonly services = signal<ServiceDto[]>([]);
  readonly selectedTeeth = signal<number[]>([]);
  readonly selectedFiles = signal<File[]>([]);
  readonly currentStep = signal<number>(1); // 1..6, step 6 = Review
  readonly totalSteps = 6;

  // Upload progress state
  readonly uploadStates = signal<FileUploadState[]>([]);
  readonly isUploading = signal(false);
  readonly uploadPhase = signal<'idle' | 'uploading' | 'creating' | 'done'>('idle');

  readonly overallProgress = computed(() => {
    const states = this.uploadStates();
    if (!states.length) return 0;
    return Math.round(states.reduce((sum, s) => sum + s.progress, 0) / states.length);
  });

  readonly completedUploadsCount = computed(() => {
    return this.uploadStates().filter(s => s.status === 'done').length;
  });

  readonly form = this.fb.group({
    patientName: ['', [Validators.required, Validators.minLength(3)]],
    patientGender: ['Male', [Validators.required]],
    patientAge: [30, [Validators.required, Validators.min(1)]],
    requiredDeliveryDate: ['', [Validators.required]],
    expressChecked: [false],
    previewRequired: [true],
    gumDesignChecked: [false],
    serviceIds: [[] as string[], [Validators.required]],
    implantHolesCount: [1, [Validators.min(1)]],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.isLoading.set(true);
    this.catalogService.getServices().subscribe({
      next: (res) => {
        this.services.set(res.filter(s => s.isActive));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  readonly hasPerHoleService = computed(() => {
    const selectedIds = this.form.get('serviceIds')?.value || [];
    return this.services().some(s => selectedIds.includes(s.id) && s.pricingMethod === 2);
  });

  readonly pricingSummary = computed(() => {
    const selectedIds = this.form.get('serviceIds')?.value || [];
    const teeth = this.selectedTeeth();
    const express = this.form.get('expressChecked')?.value || false;
    const gum = this.form.get('gumDesignChecked')?.value || false;
    const holes = this.form.get('implantHolesCount')?.value || 1;

    let basePrice = 0;
    let gumFee = 0;

    this.services().forEach(s => {
      if (selectedIds.includes(s.id)) {
        if (s.pricingMethod === 0) {
          basePrice += s.price * teeth.length;
        } else if (s.pricingMethod === 1) {
          const hasUpper = teeth.some(t => t >= 11 && t <= 28);
          const hasLower = teeth.some(t => t >= 31 && t <= 48);
          const archCount = (hasUpper ? 1 : 0) + (hasLower ? 1 : 0);
          basePrice += s.price * (archCount || 1);
        } else if (s.pricingMethod === 2) {
          const unitRate = holes >= 4 ? s.price * 1.5 : s.price;
          basePrice += unitRate * holes;
        } else {
          basePrice += s.price;
        }

        const isImplantOrAllOnX = s.serviceCode.includes('ABUT') ||
                                  s.serviceCode.includes('GUIDE') ||
                                  s.serviceCode.includes('IMPLANT') ||
                                  s.nameEn.toLowerCase().includes('all-on');
        if (gum && isImplantOrAllOnX) {
          if (s.nameEn.toLowerCase().includes('all-on')) {
            gumFee += 300;
          } else {
            gumFee += 50 * teeth.length;
          }
        }
      }
    });

    const subtotal = basePrice + gumFee;
    const expressFee = express ? subtotal * 0.5 : 0;
    const finalPrice = subtotal + expressFee;

    return { basePrice, gumFee, expressFee, finalPrice };
  });

  onTeethToggled(tooth: number): void {}

  onFilesSelected(files: File[]): void {
    this.selectedFiles.set(files);
  }

  toggleServiceSelection(serviceId: string): void {
    const control = this.form.get('serviceIds');
    if (!control) return;
    const current = [...(control.value || [])];
    const idx = current.indexOf(serviceId);
    if (idx > -1) current.splice(idx, 1);
    else current.push(serviceId);
    control.setValue(current);
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps && this.isCurrentStepValid()) {
      this.currentStep.set(this.currentStep() + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(step: number): void {
    if (step > 1 && step < this.totalSteps && step <= this.currentStep() + 1) {
      this.currentStep.set(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private isCurrentStepValid(): boolean {
    const step = this.currentStep();
    switch (step) {
      case 1:
        return !!(this.form.get('patientName')?.valid &&
                  this.form.get('patientAge')?.valid &&
                  this.form.get('patientGender')?.valid &&
                  this.form.get('requiredDeliveryDate')?.valid);
      case 2:
        const serviceIds = this.form.get('serviceIds')?.value;
        return !!(this.form.get('serviceIds')?.valid && serviceIds && serviceIds.length > 0);
      case 3:
        return this.selectedTeeth().length > 0;
      case 4:
        return this.selectedFiles().length > 0;
      default:
        return true;
    }
  }

  /**
   * Step 6 submit:
   *  1. Upload all files sequentially with per-file progress tracking
   *  2. After all uploads succeed → create the order
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (this.selectedTeeth().length === 0) {
      this.toast.error('يرجى تحديد سن واحد على الأقل من مخطط الأسنان');
      return;
    }
    if (this.selectedFiles().length === 0) {
      this.toast.error('يرجى رفع ملفات التصميم (STL/OBJ) الخاصة بالطلب');
      return;
    }

    // Initialise upload states for each file
    const files = this.selectedFiles();
    this.uploadStates.set(files.map(f => ({ file: f, progress: 0, status: 'pending' })));
    this.uploadPhase.set('uploading');
    this.isUploading.set(true);

    const formVal = this.form.value;
    const payload: OrderCreateRequest = {
      patientName: formVal.patientName!,
      patientGender: formVal.patientGender!,
      patientAge: formVal.patientAge!,
      requiredDeliveryDate: new Date(formVal.requiredDeliveryDate!).toISOString(),
      expressChecked: formVal.expressChecked || false,
      previewRequired: formVal.previewRequired || false,
      gumDesignChecked: formVal.gumDesignChecked || false,
      selectedTeeth: this.selectedTeeth(),
      serviceIds: formVal.serviceIds!,
      notes: formVal.notes || ''
    };

    // First: create the order to get an ID
    this.orderService.createOrder(payload).subscribe({
      next: (order) => {
        // Then: upload files one by one with progress
        this.uploadFilesSequentially(order.id, files, 0);
      },
      error: () => {
        this.uploadPhase.set('idle');
        this.isUploading.set(false);
      }
    });
  }

  private uploadFilesSequentially(orderId: string, files: File[], index: number): void {
    if (index >= files.length) {
      // All done
      this.uploadPhase.set('done');
      this.isUploading.set(false);
      this.toast.success('تم رفع الملفات وإنشاء طلب التصميم بنجاح ✅');
      this.router.navigate(['/client/orders', orderId]);
      return;
    }

    // Mark current file as uploading
    this.uploadStates.update(states =>
      states.map((s, i) => i === index ? { ...s, status: 'uploading' } : s)
    );

    this.orderService.uploadFileWithProgress(orderId, files[index], 'input').subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const pct = Math.round((event.loaded / event.total) * 100);
          this.uploadStates.update(states =>
            states.map((s, i) => i === index ? { ...s, progress: pct } : s)
          );
        } else if (event.type === HttpEventType.Response) {
          // File uploaded successfully
          this.uploadStates.update(states =>
            states.map((s, i) => i === index ? { ...s, progress: 100, status: 'done' } : s)
          );
          // Move to next file
          this.uploadFilesSequentially(orderId, files, index + 1);
        }
      },
      error: () => {
        this.uploadStates.update(states =>
          states.map((s, i) => i === index ? { ...s, status: 'error' } : s)
        );
        this.uploadPhase.set('idle');
        this.isUploading.set(false);
        this.toast.error(`فشل رفع الملف: ${files[index].name}`);
      }
    });
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}
