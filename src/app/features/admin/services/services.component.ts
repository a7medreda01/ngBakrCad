import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../core/services/catalog-service.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ServiceDto, CreateServiceRequest, PricingMethod } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  readonly String = String;
  readonly isLoading = signal(false);
  readonly services = signal<ServiceDto[]>([]);

  // Modal states
  readonly showEditModal = signal(false);
  readonly showCreateModal = signal(false);
  readonly showDeleteConfirm = signal(false);
  readonly isSubmitting = signal(false);

  // Selected Service for edit/delete
  readonly selectedService = signal<ServiceDto | null>(null);
  readonly isEditMode = signal(false); // true for edit, false for create

  readonly availableCategories = signal<{ categoryAr: string; categoryEn: string }[]>([]);

  // Form for both create and edit
  form = this.fb.group({
    serviceCode: ['', [Validators.required]],
    nameAr: ['', [Validators.required]],
    nameEn: ['', [Validators.required]],
    descriptionAr: [''],
    descriptionEn: [''],
    categoryAr: ['التيجان والقبعات'],
    categoryEn: ['Crowns & Copings'],
    pricingMethod: ['FixedCase', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    designerProfit: [50, [Validators.required, Validators.min(0)]],
    minimumDeliveryHours: [24, [Validators.required, Validators.min(1)]],
    duplicationTooth: [false]
  }); 

  readonly pricingMethods = [
    { value: 'PerTooth', label: 'لكل سن', numValue: 0 },
    { value: 'PerArch', label: 'لكل فك واحد', numValue: 1 },
    { value: 'PerHole', label: 'لكل زرعة (فتحة)', numValue: 2 },
    { value: 'FixedCase', label: 'سعر ثابت للحالة', numValue: 3 },
    { value: 'Quotation', label: 'تسعير بالطلب', numValue: 4 }
  ];

  getPricingMethodLabel(method: any): string {
    if (typeof method === 'string') {
      return this.pricingMethods.find(m => m.value === method)?.label || 'غير معروف';
    }
    return this.pricingMethods.find(m => m.numValue === method)?.label || 'غير معروف';
  }

  getPricingMethodValue(method: any): string {
    if (typeof method === 'string') {
      return method;
    }
    return this.pricingMethods.find(m => m.numValue === method)?.value || 'FixedCase';
  }

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.isLoading.set(true);
    this.catalogService.getServices().subscribe({
      next: (res) => {
        this.services.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toast.error('فشل في تحميل الخدمات');
        this.isLoading.set(false);
      }
    });
  }

  // ────────────── CREATE SERVICE ──────────────
  openCreateModal(): void {
    this.form.reset({
      serviceCode: '',
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      categoryAr: 'التيجان والقبعات',
      categoryEn: 'Crowns & Copings',
      pricingMethod: 'FixedCase',
      price: 0,
      designerProfit: 50,
      minimumDeliveryHours: 24
    });
    this.isEditMode.set(false);
    this.selectedService.set(null);
    this.showCreateModal.set(true);
  }

  submitCreate(): void {
    if (this.form.invalid) {
      this.toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    this.isSubmitting.set(true);
    const request: CreateServiceRequest = {
      serviceCode: this.form.value.serviceCode || '',
      nameAr: this.form.value.nameAr || '',
      nameEn: this.form.value.nameEn || '',
      descriptionAr: this.form.value.descriptionAr || '',
      descriptionEn: this.form.value.descriptionEn || '',
      categoryAr: this.form.value.categoryAr || 'التيجان والقبعات',
      categoryEn: this.form.value.categoryEn || 'Crowns & Copings',
      pricingMethod: (this.form.value.pricingMethod as any) || 'FixedCase',
      price: this.form.value.price || 0,
      designerProfit: this.form.value.designerProfit || 0,
      minimumDeliveryHours: this.form.value.minimumDeliveryHours || 24,
      duplicationTooth: this.form.value.duplicationTooth || false // Default value; adjust as needed
    };

    this.catalogService.createService(request).subscribe({
      next: () => {
        this.toast.success('تم إنشاء الخدمة بنجاح');
        this.showCreateModal.set(false);
        this.form.reset();
        this.loadServices();
      },
      error: (err) => {
        console.error('Create service error:', err);
        this.toast.error(err?.error?.message || 'فشل في إنشاء الخدمة');
      },
      complete: () => this.isSubmitting.set(false)
    });
  }

  // ────────────── EDIT SERVICE ──────────────
  openEditModal(service: ServiceDto): void {
    this.selectedService.set(service);
    this.form.patchValue({
      serviceCode: service.serviceCode,
      nameAr: service.nameAr,
      nameEn: service.nameEn,
      descriptionAr: service.descriptionAr,
      descriptionEn: service.descriptionEn,
      categoryAr: service.categoryAr || 'التيجان والقبعات',
      categoryEn: service.categoryEn || 'Crowns & Copings',
      pricingMethod: this.getPricingMethodValue(service.pricingMethod),
      price: service.price,
      designerProfit: service.designerProfit,
      minimumDeliveryHours: service.minimumDeliveryHours
    });
    this.isEditMode.set(true);
    this.showEditModal.set(true);
  }

  submitUpdate(): void {
    const service = this.selectedService();
    if (!service || this.form.invalid) {
      this.toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    this.isSubmitting.set(true);
    const updateRequest = {
      nameAr: this.form.value.nameAr || '',
      nameEn: this.form.value.nameEn || '',
      descriptionAr: this.form.value.descriptionAr || '',
      descriptionEn: this.form.value.descriptionEn || '',
      categoryAr: this.form.value.categoryAr || 'التيجان والقبعات',
      categoryEn: this.form.value.categoryEn || 'Crowns & Copings',
      pricingMethod: this.form.value.pricingMethod || 'FixedCase',
      price: this.form.value.price || 0,
      designerProfit: this.form.value.designerProfit || 0,
      minimumDeliveryHours: this.form.value.minimumDeliveryHours || 24,
      isActive: service.isActive
    };

    this.catalogService.updateService(service.id, updateRequest as any).subscribe({
      next: () => {
        this.toast.success('تم تحديث الخدمة بنجاح');
        this.showEditModal.set(false);
        this.loadServices();
      },
      error: (err) => {
        console.error('Update service error:', err);
        this.toast.error(err?.error?.message || 'فشل في تحديث الخدمة');
      },
      complete: () => this.isSubmitting.set(false)
    });
  }

  // ────────────── DELETE SERVICE ──────────────
  openDeleteConfirm(service: ServiceDto): void {
    this.selectedService.set(service);
    this.showDeleteConfirm.set(true);
  }

  confirmDelete(): void {
    const service = this.selectedService();
    if (!service) return;

    this.isSubmitting.set(true);
    this.catalogService.deleteService(service.id).subscribe({
      next: () => {
        this.toast.success('تم حذف الخدمة بنجاح');
        this.showDeleteConfirm.set(false);
        this.loadServices();
      },
      error: (err) => {
        console.error('Delete service error:', err);
        this.toast.error(err?.error?.message || 'فشل في حذف الخدمة');
      },
      complete: () => this.isSubmitting.set(false)
    });
  }

  closeModals(): void {
    this.showEditModal.set(false);
    this.showCreateModal.set(false);
    this.showDeleteConfirm.set(false);
    this.form.reset();
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}
