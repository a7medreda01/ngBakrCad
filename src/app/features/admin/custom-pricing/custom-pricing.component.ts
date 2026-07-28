import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CatalogService } from '../../../core/services/catalog-service.service';
import { AdminService } from '../../../core/services/admin.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';
import { ServiceDto, SetCustomPriceRequest, SetCustomProfitRequest, DesignerServicePricingDto } from '../../../core/models';

interface DoctorPricing {
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  catalogPrice: number;
  customPrice: number;
  discount: number;
  pricingMethod: string;
}

interface DesignerPricing {
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  catalogProfit: number;
  customProfit: number;
}

@Component({
  selector: 'app-custom-pricing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './custom-pricing.component.html',
  styleUrl: './custom-pricing.component.scss'
})
export class CustomPricingComponent implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);
  readonly Math = Math;
  readonly String = String;

  // Tab control
  readonly activeTab = signal<'doctor' | 'designer'>('doctor');

  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly services = signal<ServiceDto[]>([]);
  readonly selectedDoctor = signal<any>(null);
  readonly doctorPricings = signal<DoctorPricing[]>([]);
  readonly showModal = signal(false);
  readonly selectedService = signal<ServiceDto | null>(null);

  // Designer profit state
  readonly selectedDesigner = signal<any>(null);
  readonly designerPricings = signal<DesignerPricing[]>([]);
  readonly showProfitModal = signal(false);
  readonly selectedProfitService = signal<ServiceDto | null>(null);

  // Search and pagination
  readonly searchTerm = signal('');
  readonly filteredDoctors = signal<any[]>([]);
  readonly showDoctorDropdown = signal(false);
  readonly isSearchingDoctors = signal(false);
  readonly filteredServices = signal<ServiceDto[]>([]);

  // Designer search
  readonly designerSearchTerm = signal('');
  readonly filteredDesigners = signal<any[]>([]);
  readonly showDesignerDropdown = signal(false);
  readonly isSearchingDesigners = signal(false);

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private designerSearchDebounce: ReturnType<typeof setTimeout> | null = null;

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

  form = this.fb.group({
    doctorId: ['', [Validators.required]],
    customPrice: [0, [Validators.required, Validators.min(0)]]
  });

  profitForm = this.fb.group({
    designerId: ['', [Validators.required]],
    customProfit: [0, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    this.loadServices();
    this.route.queryParams.subscribe(params => {
      const userId = params['userId'];
      const name = params['name'];
      const role = params['role'];
      if (role === 'Designer' || role === 'Lab') {
        this.switchTab('designer');
      } else if (role === 'Doctor') {
        this.switchTab('doctor');
      }

      if (userId && name && role) {
        const user = { id: userId, fullName: name };
        if (role === 'Designer' || role === 'Lab') {
          this.selectDesigner(user);
        } else {
          this.selectDoctor(user);
        }
      }
    });
  }

  switchTab(tab: 'doctor' | 'designer'): void {
    this.activeTab.set(tab);
  }

  loadServices(): void {
    this.isLoading.set(true);
    this.catalogService.getServices().subscribe({
      next: (res) => {
        this.services.set(res);
        this.filteredServices.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('فشل تحميل الخدمات');
        this.isLoading.set(false);
      }
    });
  }

  // ==================== DOCTOR TAB ====================

  onDoctorSearch(search: string): void {
    this.searchTerm.set(search);
    this.selectedDoctor.set(null);

    if (this.searchDebounce) clearTimeout(this.searchDebounce);

    if (search.trim().length < 1) {
      this.filteredDoctors.set([]);
      this.showDoctorDropdown.set(false);
      return;
    }

    this.searchDebounce = setTimeout(() => {
      this.isSearchingDoctors.set(true);
      this.adminService.getUsers(1, 10, search, 'Doctor').subscribe({
        next: (res: any) => {
          const usersList = res?.items || res?.data || [];
          this.filteredDoctors.set(usersList);
          this.showDoctorDropdown.set(true);
          this.isSearchingDoctors.set(false);
        },
        error: () => {
          this.toast.error('فشل البحث عن الأطباء');
          this.filteredDoctors.set([]);
          this.isSearchingDoctors.set(false);
        }
      });
    }, 400);
  }

  selectDoctor(doctor: any): void {
    this.selectedDoctor.set(doctor);
    this.searchTerm.set(doctor.fullName);
    this.showDoctorDropdown.set(false);
    this.filteredDoctors.set([]);
    this.form.patchValue({ doctorId: doctor.id });
    this.loadDoctorCustomPrices(doctor.id);
  }

  loadDoctorCustomPrices(doctorId: string): void {
    this.isLoading.set(true);
    this.catalogService.getCustomPricesForDoctor(doctorId).subscribe({
      next: (res: any) => {
        const pricings: DoctorPricing[] = res.map((p: any) => ({
          serviceId: p.serviceId,
          serviceName: this.i18n.currentLang() === 'ar' ? p.serviceNameAr : p.serviceNameEn,
          serviceCode: p.serviceCode,
          catalogPrice: p.catalogPrice,
          customPrice: p.customPrice,
          discount: p.discount,
          pricingMethod: p.pricingMethod
        }));
        this.doctorPricings.set(pricings);
        this.isLoading.set(false);
      },
      error: () => {
        this.doctorPricings.set([]);
        this.isLoading.set(false);
      }
    });
  }

  openSetPriceModal(service: ServiceDto): void {
    this.selectedService.set(service);
    const doctor = this.selectedDoctor();
    if (!doctor) {
      this.toast.error('يرجى اختيار طبيب أولاً');
      return;
    }

    const existing = this.doctorPricings().find(p => p.serviceId === service.id);
    this.form.patchValue({
      doctorId: doctor.id,
      customPrice: existing?.customPrice ?? service.price
    });
    this.showModal.set(true);
  }

  openEditPriceModal(pricing: DoctorPricing): void {
    // التحقق المبكر: إذا لم يكن هناك معرّف خدمة، نعرض خطأ ونخرج فوراً لتفادي أي أخطاء في الـ runtime
    if (!pricing || !pricing.serviceId) {
      this.toast.error('بيانات السعر المخصص غير مكتملة (معرّف الخدمة مفقود)');
      return;
    }

    // --- LOGGING FOR DEBUGGING ---
    console.log('--- DEBUG MATCHING ---');
    console.log('Incoming pricing.serviceId:', pricing.serviceId, typeof pricing.serviceId);
    console.log('First service ID in catalog:', this.services()[0]?.id, typeof this.services()[0]?.id);
    
    // مطابقة آمنة ضد القيم الفارغة (null/undefined) واختلاف الأنواع (string vs number)
    const service = this.services().find(s => 
      (s.id ?? '').toString().toLowerCase() === (pricing.serviceId ?? '').toString().toLowerCase()
    );

    if (service) {
      this.openSetPriceModal(service);
    } else {
      console.warn('Failed to find service. All catalog IDs:', this.services().map(s => s.id));
      this.toast.error(`لم يتم العثور على بيانات الخدمة في الكتالوج (ID: ${pricing.serviceId})`);
    }
  }

  submitCustomPrice(): void {
    if (this.form.invalid || !this.selectedService()) {
      this.toast.error('يرجى ملء جميع الحقول');
      return;
    }

    const doctor = this.selectedDoctor();
    const service = this.selectedService();

    if (!doctor || !service) return;

    this.isSubmitting.set(true);
    const request: SetCustomPriceRequest = {
      doctorId: doctor.id,
      customPrice: this.form.value.customPrice || 0
    };

    this.catalogService.setCustomPrice(service.id, request).subscribe({
      next: () => {
        this.toast.success('تم تغيير السعر المخصص بنجاح');
        this.showModal.set(false);
        this.loadDoctorCustomPrices(doctor.id);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'فشل تغيير السعر المخصص');
      },
      complete: () => this.isSubmitting.set(false)
    });
  }

  calculateDiscount(customPrice: number, catalogPrice: number): number {
    if (catalogPrice === 0) return 0;
    return Math.round(((catalogPrice - customPrice) / catalogPrice) * 100);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedService.set(null);
    this.form.reset();
  }

  // ==================== DESIGNER TAB ====================

  onDesignerSearch(search: string): void {
    this.designerSearchTerm.set(search);
    this.selectedDesigner.set(null);

    if (this.designerSearchDebounce) clearTimeout(this.designerSearchDebounce);

    if (search.trim().length < 1) {
      this.filteredDesigners.set([]);
      this.showDesignerDropdown.set(false);
      return;
    }

    this.designerSearchDebounce = setTimeout(() => {
      this.isSearchingDesigners.set(true);
      this.adminService.getUsers(1, 10, search, 'Designer').subscribe({
        next: (res: any) => {
          const usersList = res?.items || res?.data || [];
          this.filteredDesigners.set(usersList);
          this.showDesignerDropdown.set(true);
          this.isSearchingDesigners.set(false);
        },
        error: () => {
          this.toast.error('فشل البحث عن المصممين');
          this.filteredDesigners.set([]);
          this.isSearchingDesigners.set(false);
        }
      });
    }, 400);
  }

  selectDesigner(designer: any): void {
    this.selectedDesigner.set(designer);
    this.designerSearchTerm.set(designer.fullName);
    this.showDesignerDropdown.set(false);
    this.filteredDesigners.set([]);
    this.profitForm.patchValue({ designerId: designer.id });
    this.loadDesignerCustomProfits(designer.id);
  }

  loadDesignerCustomProfits(designerId: string): void {
    this.isLoading.set(true);
    this.catalogService.getCustomProfitsForDesigner(designerId).subscribe({
      next: (res: DesignerServicePricingDto[]) => {
        const pricings: DesignerPricing[] = res.map((p) => ({
          serviceId: p.serviceId,
          serviceName: this.i18n.currentLang() === 'ar' ? p.serviceNameAr : p.serviceNameEn,
          serviceCode: p.serviceCode,
          catalogProfit: p.catalogProfit,
          customProfit: p.customProfit
        }));
        this.designerPricings.set(pricings);
        this.isLoading.set(false);
      },
      error: () => {
        this.designerPricings.set([]);
        this.isLoading.set(false);
      }
    });
  }

  openSetProfitModal(service: ServiceDto): void {
    this.selectedProfitService.set(service);
    const designer = this.selectedDesigner();
    if (!designer) {
      this.toast.error('يرجى اختيار مصمم أولاً');
      return;
    }

    const existing = this.designerPricings().find(p => p.serviceId === service.id);
    this.profitForm.patchValue({
      designerId: designer.id,
      customProfit: existing?.customProfit ?? service.designerProfit
    });
    this.showProfitModal.set(true);
  }

  openEditProfitModal(pricing: DesignerPricing): void {
    // التحقق المبكر: إذا لم يكن هناك معرّف خدمة، نعرض خطأ ونخرج فوراً
    if (!pricing || !pricing.serviceId) {
      this.toast.error('بيانات الربح المخصص غير مكتملة (معرّف الخدمة مفقود)');
      return;
    }

    // مطابقة آمنة ضد القيم الفارغة واختلاف الأنواع (string vs number)
    const service = this.services().find(s => 
      (s.id ?? '').toString().toLowerCase() === (pricing.serviceId ?? '').toString().toLowerCase()
    );

    if (service) {
      this.openSetProfitModal(service);
    } else {
      this.toast.error('لم يتم العثور على بيانات الخدمة في الكتالوج');
    }
  }

  submitCustomProfit(): void {
    if (this.profitForm.invalid || !this.selectedProfitService()) {
      this.toast.error('يرجى ملء جميع الحقول');
      return;
    }

    const designer = this.selectedDesigner();
    const service = this.selectedProfitService();

    if (!designer || !service) return;

    this.isSubmitting.set(true);
    const request: SetCustomProfitRequest = {
      designerId: designer.id,
      customProfit: this.profitForm.value.customProfit || 0
    };

    this.catalogService.setCustomProfit(service.id, request).subscribe({
      next: () => {
        this.toast.success('تم تعيين ربح المصمم المخصص بنجاح');
        this.showProfitModal.set(false);
        this.loadDesignerCustomProfits(designer.id);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'فشل تعيين ربح المصمم');
      },
      complete: () => this.isSubmitting.set(false)
    });
  }

  closeProfitModal(): void {
    this.showProfitModal.set(false);
    this.selectedProfitService.set(null);
    this.profitForm.reset();
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}