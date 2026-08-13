import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { OrderService } from '../../../core/services/order.service';
import { CatalogService } from '../../../core/services/catalog-service.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AdminService } from '../../../core/services/admin.service';
import { ServiceDto, AdminOrderCreateRequest, OrderServiceSelection, PricingMethod } from '../../../core/models';
import { OdontogramComponent } from '../../../shared/components/odontogram/odontogram.component';
import { FileUploaderComponent } from '../../../shared/ui/file-uploader/file-uploader.component';
import { ToastService } from '../../../core/services/toast.service';
import { DateTimePickerComponent, DateTimeConfirmEvent } from '../../../shared/ui/date-time-picker/date-time-picker.component';

export interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

export interface ServiceAssignment {
  id: string;
  service: ServiceDto;
  targetType: 'tooth' | 'upper_arch' | 'lower_arch' | 'full_case';
  teeth: number[];
}

export interface CategorizedGroup {
  categoryAr: string;
  categoryEn: string;
  colorClass: string;
  services: ServiceDto[];
}

export interface DoctorSearchResult {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  profilePictureUrl?: string | null;
  clinicName?: string | null;
  country?: string | null;
  city?: string | null;
  level?: string | null;
  creditLimit?: number;
  negativeBalanceAllowed?: boolean;
  walletBalance?: number;
  completedCasesCount?: number;
  caseCompletionRate?: number;
}

@Component({
  selector: 'app-admin-create-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, OdontogramComponent, FileUploaderComponent, DateTimePickerComponent],
  templateUrl: './admin-create-order.component.html',
  styleUrl: './admin-create-order.component.scss'
})
export class AdminCreateOrderComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly catalogService = inject(CatalogService);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly adminService = inject(AdminService);

  readonly PricingMethod = PricingMethod;

  readonly scopeOptions = [
    { key: 'tooth' as const, label: 'سن محدد', icon: 'bi-bullseye' },
    { key: 'upper_arch' as const, label: 'الفك العلوي', icon: 'bi-arrow-up-circle-fill' },
    { key: 'lower_arch' as const, label: 'الفك السفلي', icon: 'bi-arrow-down-circle-fill' },
    { key: 'full_case' as const, label: 'الحالة كاملة', icon: 'bi-grid-fill' },
  ];

  // Doctor Search
  readonly doctorSearchQuery = signal('');
  readonly doctorSearchResults = signal<DoctorSearchResult[]>([]);
  readonly selectedDoctor = signal<DoctorSearchResult | null>(null);
  readonly isDoctorSearchLoading = signal(false);
  readonly showDoctorDropdown = signal(false);
  private readonly searchSubject = new Subject<string>();

  // Order Creation
  readonly showDatePicker = signal(false);
  readonly expandedServiceId = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly services = signal<ServiceDto[]>([]);
  readonly selectedTeeth = signal<number[]>([]);
  readonly selectedFiles = signal<File[]>([]);
  readonly assignments = signal<ServiceAssignment[]>([]);
  readonly activeScope = signal<'tooth' | 'upper_arch' | 'lower_arch' | 'full_case'>('tooth');
  readonly activeTooth = signal<number | null>(null);

  // Steps: 0=Doctor Select, 1=Services/Teeth, 2=Patient, 3=Files, 4=Review
  readonly currentStep = signal<number>(0);
  readonly totalSteps = 5;

  readonly uploadStates = signal<FileUploadState[]>([]);
  readonly isUploading = signal(false);
  readonly uploadPhase = signal<'idle' | 'uploading' | 'creating' | 'done'>('idle');
  readonly showExpressModal = signal(false);

  readonly overallProgress = computed(() => {
    const states = this.uploadStates();
    if (!states.length) return 0;
    return Math.round(states.reduce((sum, s) => sum + s.progress, 0) / states.length);
  });

  readonly completedUploadsCount = computed(() => {
    return this.uploadStates().filter(s => s.status === 'done').length;
  });

  readonly assignedTeeth = computed<number[]>(() => {
    const set = new Set<number>();
    this.assignments().forEach(a => a.teeth.forEach(t => set.add(t)));
    return Array.from(set);
  });

  readonly categorizedServices = computed<CategorizedGroup[]>(() => {
    const all = this.services();
    const isAr = this.i18n.currentLang() === 'ar';
    const colorPalette = [
      'from-purple-600 to-indigo-700 text-white',
      'from-blue-600 to-cyan-600 text-white',
      'from-emerald-600 to-teal-700 text-white',
      'from-amber-500 to-orange-600 text-white',
      'from-rose-600 to-pink-600 text-white',
      'from-slate-700 to-slate-900 text-white',
      'from-indigo-600 to-violet-700 text-white'
    ];
    let colorIdx = 0;
    const groupsMap = new Map<string, { ar: string; en: string; color: string; services: ServiceDto[] }>();

    all.forEach(s => {
      let catAr = s.categoryAr || '';
      let catEn = s.categoryEn || '';
      if (!catAr) {
        const code = s.serviceCode;
        if (code.startsWith('A')) { catAr = 'التيجان والقبعات'; catEn = 'Crowns & Copings'; }
        else if (code.startsWith('B')) { catAr = 'الدعامات والزراعة'; catEn = 'Implants & Abutments'; }
        else if (code.startsWith('C')) { catAr = 'الأطقم المتحركة'; catEn = 'Removables & Dentures'; }
        else if (code.startsWith('D')) { catAr = 'الحارسات والتقويم'; catEn = 'Splints & Orthodontics'; }
        else if (code.startsWith('E')) { catAr = 'الأدلة الجراحية'; catEn = 'Surgical Guides'; }
        else if (code.startsWith('F')) { catAr = 'الهياكل المعدنية والجسور'; catEn = 'Full Arch & Bars'; }
        else { catAr = 'التصاميم الجمالية والنماذج'; catEn = 'Aesthetics & Models'; }
      }
      const groupKey = isAr ? catAr : (catEn || catAr);
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, { ar: catAr, en: catEn || catAr, color: colorPalette[colorIdx++ % colorPalette.length], services: [] });
      }
      groupsMap.get(groupKey)!.services.push(s);
    });

    return Array.from(groupsMap.values()).map(g => ({
      categoryAr: g.ar, categoryEn: g.en, colorClass: g.color, services: g.services
    }));
  });

  readonly form = this.fb.group({
    patientName: ['', [Validators.required, Validators.minLength(3)]],
    patientFileNumber: [''],
    patientGender: ['Male', [Validators.required]],
    patientAge: [30, [Validators.required, Validators.min(1)]],
    requiredDeliveryDate: ['', [Validators.required]],
    expressChecked: [false],
    previewRequired: [true],
    gumDesignChecked: [false],
    implantHolesCount: [1, [Validators.min(1)]],
    notes: [''],
    serviceIds: [[] as string[]]
  });

  ngOnInit(): void {
    this.loadServices();
    this.setupDoctorSearch();
  }

  setupDoctorSearch(): void {
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q || q.trim().length < 2) return of({ items: [] as any[] });
        this.isDoctorSearchLoading.set(true);
        return this.adminService.getUsers(1, 10, q.trim(), 'Doctor');
      })
    ).subscribe({
      next: (res) => {
        const items: DoctorSearchResult[] = (res.items || []).map((u: any) => {
          const cp = u.clientProfile || u.profile || {};
          return {
            userId: u.id || u.userId,
            fullName: u.fullName || '',
            email: u.email || '',
            phoneNumber: u.phoneNumber || '',
            profilePictureUrl: u.profilePictureUrl || null,
            clinicName: cp.clinicName || u.clinicName || null,
            country: cp.country || u.country || null,
            city: cp.city || u.city || null,
            level: cp.level || 'Bronze',
            creditLimit: cp.creditLimit ?? 0,
            negativeBalanceAllowed: cp.negativeBalanceAllowed ?? false,
            walletBalance: cp.walletBalance ?? u.walletBalance ?? 0,
            completedCasesCount: cp.completedCasesCount ?? 0,
            caseCompletionRate: cp.caseCompletionRate ?? 0,
          };
        });
        this.doctorSearchResults.set(items);
        this.isDoctorSearchLoading.set(false);
        this.showDoctorDropdown.set(items.length > 0);
      },
      error: () => { this.isDoctorSearchLoading.set(false); }
    });
  }

  onDoctorSearchInput(value: string): void {
    this.doctorSearchQuery.set(value);
    this.searchSubject.next(value);
    if (!value) {
      this.showDoctorDropdown.set(false);
      this.doctorSearchResults.set([]);
    }
  }

  selectDoctor(doctor: DoctorSearchResult): void {
    this.selectedDoctor.set(doctor);
    this.doctorSearchQuery.set(doctor.fullName);
    this.showDoctorDropdown.set(false);
  }

  clearDoctorSelection(): void {
    this.selectedDoctor.set(null);
    this.doctorSearchQuery.set('');
    this.doctorSearchResults.set([]);
  }

  loadServices(): void {
    this.isLoading.set(true);
    this.catalogService.getServices().subscribe({
      next: (res) => { this.services.set(res.filter(s => s.isActive)); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  serviceName(s: ServiceDto): string {
    return this.i18n.currentLang() === 'ar' ? (s.nameAr || s.nameEn) : (s.nameEn || s.nameAr);
  }

  serviceDesc(s: ServiceDto): string {
    return this.i18n.currentLang() === 'ar' ? (s.descriptionAr || s.descriptionEn) : (s.descriptionEn || s.descriptionAr);
  }

  categoryLabel(cat: CategorizedGroup): string {
    return this.i18n.currentLang() === 'ar' ? cat.categoryAr : (cat.categoryEn || cat.categoryAr);
  }

  onOdontogramChange(teeth: number[]): void {
    const prev = this.selectedTeeth();
    this.selectedTeeth.set(teeth);
    const added = teeth.find(t => !prev.includes(t));
    if (added !== undefined) { this.activeScope.set('tooth'); this.activeTooth.set(added); }
    else if (teeth.length === 0) { this.activeTooth.set(null); }
  }

  selectScope(scope: 'tooth' | 'upper_arch' | 'lower_arch' | 'full_case'): void {
    this.activeScope.set(scope);
    if (scope !== 'tooth') this.activeTooth.set(null);
  }

  assignServiceToActiveTarget(service: ServiceDto): void {
    const selectedTeeth = this.selectedTeeth();
    const isPerToothLike = service.pricingMethod === PricingMethod.PerTooth || service.pricingMethod === PricingMethod.PerHole;
    const isPerArch = service.pricingMethod === PricingMethod.PerArch;
    const isQuotation = service.pricingMethod === PricingMethod.Quotation;

    if ((isPerToothLike || isPerArch) && selectedTeeth.length === 0) {
      this.toast.warning('يرجى تحديد سن أو أكثر من مخطط الأسنان أولاً');
      return;
    }

    const upperTeeth = selectedTeeth.filter(t => (t >= 11 && t <= 18) || (t >= 21 && t <= 28));
    const lowerTeeth = selectedTeeth.filter(t => (t >= 31 && t <= 38) || (t >= 41 && t <= 48));
    const assignmentsToAdd: ServiceAssignment[] = [];

    if (isPerToothLike) {
      assignmentsToAdd.push({ id: Math.random().toString(36).substring(2, 9), service, targetType: 'tooth', teeth: [...selectedTeeth] });
    } else if (isPerArch) {
      if (upperTeeth.length > 0) assignmentsToAdd.push({ id: Math.random().toString(36).substring(2, 9), service, targetType: 'upper_arch', teeth: [...upperTeeth] });
      if (lowerTeeth.length > 0) assignmentsToAdd.push({ id: Math.random().toString(36).substring(2, 9), service, targetType: 'lower_arch', teeth: [...lowerTeeth] });
      if (assignmentsToAdd.length === 0) { this.toast.warning('يرجى تحديد أسنان علوية أو سفلية'); return; }
    } else if (isQuotation) {
      assignmentsToAdd.push({ id: Math.random().toString(36).substring(2, 9), service, targetType: 'full_case', teeth: [] });
    } else {
      assignmentsToAdd.push({ id: Math.random().toString(36).substring(2, 9), service, targetType: 'full_case', teeth: [] });
    }

    this.assignments.update(list => [...list, ...assignmentsToAdd]);
    if (selectedTeeth.length > 0) { this.selectedTeeth.set([]); this.activeTooth.set(null); }
    this.toast.success(`تمت إضافة "${this.serviceName(service)}" بنجاح`);
  }

  removeAssignment(id: string): void { this.assignments.update(list => list.filter(a => a.id !== id)); }
  clearAllAssignments(): void { this.assignments.set([]); }

  getAssignmentItemPrice(a: ServiceAssignment): number {
    const s = a.service;
    switch (s.pricingMethod) {
      case PricingMethod.PerTooth: return s.price * Math.max(1, a.teeth.length);
      case PricingMethod.PerArch: return s.price;
      case PricingMethod.PerHole: { const qty = Math.max(1, a.teeth.length); return (qty >= 4 ? s.price * 1.5 : s.price) * qty; }
      case PricingMethod.Quotation: return 0;
      default: return s.price;
    }
  }

  pricingSummary(): { basePrice: number; expressFee: number; finalPrice: number } {
    const express = this.form.get('expressChecked')?.value || false;
    let basePrice = 0;
    this.assignments().forEach(a => { basePrice += this.getAssignmentItemPrice(a); });
    const expressFee = express ? basePrice * 0.5 : 0;
    return { basePrice, expressFee, finalPrice: basePrice + expressFee };
  }

  requiredMinimumHours(): number {
    const services = this.assignments().map(a => a.service);
    if (!services.length) return 24;
    return Math.max(...services.map(s => s.minimumDeliveryHours || 24));
  }

  earliestAllowedDate(): Date { const d = new Date(); d.setHours(d.getHours() + this.requiredMinimumHours()); return d; }

  isDeliveryDateValid(): boolean {
    const dateVal = this.form.get('requiredDeliveryDate')?.value;
    if (!dateVal) return false;
    if (this.form.get('expressChecked')?.value) return true;
    return new Date(dateVal).getTime() >= this.earliestAllowedDate().getTime();
  }

  formattedDeliveryDate(): string {
    const val = this.form.get('requiredDeliveryDate')?.value;
    if (!val) return '';
    return new Date(val).toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' });
  }

  formattedEarliestDate(): string {
    return this.earliestAllowedDate().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  }

  getPricingTermText(s: ServiceDto): string {
    const isAr = this.i18n.currentLang() === 'ar';
    switch (s.pricingMethod) {
      case PricingMethod.PerTooth: return isAr ? `${s.price} SAR / سن` : `${s.price} SAR / tooth`;
      case PricingMethod.PerHole: return isAr ? `${s.price} SAR / غرسة` : `${s.price} SAR / hole`;
      case PricingMethod.PerArch: return isAr ? `${s.price} SAR / فك` : `${s.price} SAR / arch`;
      case PricingMethod.Quotation: return isAr ? 'بالتسعير' : 'Quotation';
      default: return isAr ? `${s.price} SAR / حالة` : `${s.price} SAR / case`;
    }
  }

  getPricingBadgeIcon(s: ServiceDto): string {
    switch (s.pricingMethod) {
      case PricingMethod.PerTooth: return 'bi-bullseye text-blue-500';
      case PricingMethod.PerHole: return 'bi-pin-fill text-amber-500';
      case PricingMethod.PerArch: return 'bi-arrow-up-circle-fill text-emerald-500';
      case PricingMethod.Quotation: return 'bi-tag-fill text-purple-500';
      default: return 'bi-grid-fill text-indigo-500';
    }
  }

  toggleServiceDescription(serviceId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedServiceId.update(curr => curr === serviceId ? null : serviceId);
  }

  onFilesSelected(files: File[]): void { this.selectedFiles.set(files); }
  removeFile(index: number): void { this.selectedFiles.update(files => files.filter((_, i) => i !== index)); }

  stepTitle(step: number): string {
    switch (step) {
      case 0: return 'اختيار الطبيب';
      case 1: return 'تحديد الأسنان والخدمات';
      case 2: return 'بيانات المريض وموعد التسليم';
      case 3: return 'رفع ملفات التصميم';
      case 4: return 'التأكيد النهائي';
      default: return '';
    }
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep()) {
      case 0: return !!this.selectedDoctor();
      case 1: return this.assignments().length > 0;
      case 2: return !!(this.form.get('patientName')?.valid && this.form.get('patientAge')?.valid &&
        this.form.get('patientGender')?.valid && this.form.get('requiredDeliveryDate')?.valid && this.isDeliveryDateValid());
      case 3: return this.selectedFiles().length > 0;
      default: return true;
    }
  }

  nextStep(): void {
    if (!this.isCurrentStepValid()) {
      if (this.currentStep() === 0) this.toast.warning('يرجى اختيار الطبيب أولاً');
      else if (this.currentStep() === 1) this.toast.warning('يرجى اختيار خدمة واحدة على الأقل');
      else if (this.currentStep() === 2) this.toast.warning('يرجى اكمال بيانات المريض وتاريخ التسليم');
      else if (this.currentStep() === 3) this.toast.warning('يرجى رفع ملف واحد على الأقل');
      return;
    }
    if (this.currentStep() < this.totalSteps - 1) {
      this.currentStep.set(this.currentStep() + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) { this.currentStep.set(this.currentStep() - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  goToStep(step: number): void {
    if (step >= 0 && step <= this.currentStep()) { this.currentStep.set(step); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  onSubmit(): void {
    const doctor = this.selectedDoctor();
    if (!doctor) { this.toast.error('يرجى اختيار الطبيب أولاً'); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    if (this.assignments().length === 0) { this.toast.error('يرجى اختيار الخدمات المطلوبة'); return; }
    if (this.selectedFiles().length === 0) { this.toast.error('يرجى رفع ملفات التصميم'); return; }
    if (!this.isDeliveryDateValid()) { this.toast.error(`لا يمكن استلام الطلب قبل ${this.formattedEarliestDate()}`); return; }

    const files = this.selectedFiles();
    this.uploadStates.set(files.map(f => ({ file: f, progress: 0, status: 'pending' })));
    this.uploadPhase.set('uploading');
    this.isUploading.set(true);

    const formVal = this.form.value;
    const assignmentsList = this.assignments();

    const allTeethSet = new Set<number>(this.selectedTeeth());
    assignmentsList.forEach(a => a.teeth.forEach(t => allTeethSet.add(t)));
    const allTeeth: number[] = Array.from(allTeethSet);

    const serviceIds = Array.from(new Set(assignmentsList.map(a => a.service.id)));
    const serviceSelections: OrderServiceSelection[] = assignmentsList.map(a => ({
      serviceId: a.service.id, teeth: a.teeth, targetType: a.targetType
    }));

    const payload: AdminOrderCreateRequest = {
      doctorId: doctor.userId,
      patientName: formVal.patientName!,
      patientFileNumber: formVal.patientFileNumber || '',
      patientGender: formVal.patientGender!,
      patientAge: formVal.patientAge!,
      requiredDeliveryDate: new Date(formVal.requiredDeliveryDate!).toISOString(),
      expressChecked: formVal.expressChecked || false,
      previewRequired: formVal.previewRequired || false,
      gumDesignChecked: formVal.gumDesignChecked || false,
      selectedTeeth: allTeeth,
      serviceIds,
      serviceSelections,
      notes: formVal.notes || ''
    };

    this.orderService.createOrderForDoctor(payload).subscribe({
      next: (order) => { this.uploadFilesSequentially(order.id, files, 0); },
      error: () => { this.uploadPhase.set('idle'); this.isUploading.set(false); }
    });
  }

  private uploadFilesSequentially(orderId: string, files: File[], index: number): void {
    if (index >= files.length) {
      this.uploadPhase.set('done');
      this.isUploading.set(false);
      this.toast.success('تم إنشاء الطلب ورفع الملفات بنجاح ✅');
      this.router.navigate(['/admin/orders', orderId]);
      return;
    }
    this.uploadStates.update(states => states.map((s, i) => i === index ? { ...s, status: 'uploading' } : s));
    this.orderService.uploadFileWithProgress(orderId, files[index], 'input').subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const pct = Math.round((event.loaded / event.total) * 100);
          this.uploadStates.update(states => states.map((s, i) => i === index ? { ...s, progress: pct } : s));
        } else if (event.type === HttpEventType.Response) {
          this.uploadStates.update(states => states.map((s, i) => i === index ? { ...s, progress: 100, status: 'done' } : s));
          this.uploadFilesSequentially(orderId, files, index + 1);
        }
      },
      error: () => {
        this.uploadStates.update(states => states.map((s, i) => i === index ? { ...s, status: 'error' } : s));
        this.uploadPhase.set('idle');
        this.isUploading.set(false);
        this.toast.error(`فشل رفع الملف: ${files[index].name}`);
      }
    });
  }

  openDatePicker(): void { this.showDatePicker.set(true); }
  closeDatePicker(): void { this.showDatePicker.set(false); }
  onDateConfirmed(evt: DateTimeConfirmEvent): void {
    this.form.patchValue({ requiredDeliveryDate: evt.dateStr, expressChecked: evt.withExpress });
    this.showDatePicker.set(false);
  }
  confirmExpressFromModal(): void { this.form.patchValue({ expressChecked: true }); this.showExpressModal.set(false); }
  cancelExpressModal(): void { this.form.patchValue({ requiredDeliveryDate: '' }); this.showExpressModal.set(false); }
}
