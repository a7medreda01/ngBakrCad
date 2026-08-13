import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { OrderService } from '../../../core/services/order.service';
import { CatalogService } from '../../../core/services/catalog-service.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ServiceDto, OrderCreateRequest, OrderServiceSelection, PricingMethod } from '../../../core/models';
import { OdontogramComponent } from '../../../shared/components/odontogram/odontogram.component';
import { FileUploaderComponent } from '../../../shared/ui/file-uploader/file-uploader.component';
import { ToastService } from '../../../core/services/toast.service';
import { DraftStorageService } from '../../../core/services/draft-storage.service';
import { DateTimePickerComponent, DateTimeConfirmEvent } from '../../../shared/ui/date-time-picker/date-time-picker.component';

export interface FileUploadState {
  file: File;
  progress: number;  // 0-100
  status: 'pending' | 'uploading' | 'done' | 'error';
}

export interface ServiceAssignment {
  id: string; // Unique ID
  service: ServiceDto;
  targetType: 'tooth' | 'upper_arch' | 'lower_arch' | 'full_case';
  teeth: number[]; // FDI tooth numbers
}

export interface CategorizedGroup {
  categoryAr: string;
  categoryEn: string;
  colorClass: string;
  services: ServiceDto[];
}

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OdontogramComponent, FileUploaderComponent, DateTimePickerComponent],
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
  private readonly draftStorage = inject(DraftStorageService);

  /** Expose enum to template */
  readonly PricingMethod = PricingMethod;

  /** Typed scope options for the step-1 selector */
  readonly scopeOptions = [
    { key: 'tooth'      as const, label: 'سن محدد',      icon: 'bi-bullseye' },
    { key: 'upper_arch' as const, label: 'الفك العلوي',  icon: 'bi-arrow-up-circle-fill' },
    { key: 'lower_arch' as const, label: 'الفك السفلي', icon: 'bi-arrow-down-circle-fill' },
    { key: 'full_case'  as const, label: 'الحالة كاملة', icon: 'bi-grid-fill' },
  ];

  /** Date-time picker modal visibility */
  readonly showDatePicker = signal(false);
  /** Expanded service for description details drawer */
  readonly expandedServiceId = signal<string | null>(null);

  readonly isLoading = signal(false);
  readonly services = signal<ServiceDto[]>([]);
  readonly selectedTeeth = signal<number[]>([]);
  readonly selectedFiles = signal<File[]>([]);

  // Itemized Assignments: Tooth/Scope -> Service
  readonly assignments = signal<ServiceAssignment[]>([]);
  readonly activeScope = signal<'tooth' | 'upper_arch' | 'lower_arch' | 'full_case'>('tooth');
  readonly activeTooth = signal<number | null>(null);

  // Workflow steps:
  // 1) Tooth & Service Selection  2) Patient & Delivery  3) Files  4) Review & Confirm
  readonly currentStep = signal<number>(1);
  readonly totalSteps = 4;

  // Upload progress state
  readonly uploadStates = signal<FileUploadState[]>([]);
  readonly isUploading = signal(false);
  readonly uploadPhase = signal<'idle' | 'uploading' | 'creating' | 'done'>('idle');
  readonly showExpressModal = signal(false);
  readonly hasRestoredDraft = signal(false);

  readonly overallProgress = computed(() => {
    const states = this.uploadStates();
    if (!states.length) return 0;
    return Math.round(states.reduce((sum, s) => sum + s.progress, 0) / states.length);
  });

  readonly completedUploadsCount = computed(() => {
    return this.uploadStates().filter(s => s.status === 'done').length;
  });
/** NEW: union of all teeth already committed to any assignment in the order.
   *  Passed down to the odontogram so already-assigned teeth stay visibly
   *  colored (pale red) instead of reverting to the default porcelain color
   *  once assignServiceToActiveTarget() clears selectedTeeth(). */
  readonly assignedTeeth = computed<number[]>(() => {
    const set = new Set<number>();
    this.assignments().forEach(a => a.teeth.forEach(t => set.add(t)));
    return Array.from(set);
  });
  readonly categorizedServices = computed<CategorizedGroup[]>(() => {
    const all = this.services();
    const isAr = this.i18n.currentLang() === 'ar';
    const filteredServices = all;

    const groupsMap = new Map<string, { ar: string; en: string; color: string; services: ServiceDto[] }>();

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

    filteredServices.forEach(s => {
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

      // Use language-aware key for grouping
      const groupKey = isAr ? catAr : (catEn || catAr);

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          ar: catAr,
          en: catEn || catAr,
          color: colorPalette[colorIdx % colorPalette.length],
          services: []
        });
        colorIdx++;
      }

      groupsMap.get(groupKey)!.services.push(s);
    });

    return Array.from(groupsMap.values()).map(g => ({
      categoryAr: g.ar,
      categoryEn: g.en,
      colorClass: g.color,
      services: g.services
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
    this.restoreDraftFromStorage();

    this.form.valueChanges.subscribe(() => {
      this.saveDraftToStorage();
    });
  }

  saveDraftToStorage(): void {
    this.draftStorage.saveDraft({
      form: this.form.value,
      selectedTeeth: this.selectedTeeth(),
      assignments: this.assignments(),
      currentStep: this.currentStep(),
      files: this.selectedFiles()
    });
  }

  async restoreDraftFromStorage(): Promise<void> {
    const draft = await this.draftStorage.getDraft();
    if (!draft) return;
    if (draft.form) {
      this.form.patchValue(draft.form, { emitEvent: false });
    }
    if (Array.isArray(draft.selectedTeeth)) {
      this.selectedTeeth.set(draft.selectedTeeth);
    }
    if (Array.isArray(draft.assignments)) {
      this.assignments.set(draft.assignments);
    }
    if (draft.currentStep && draft.currentStep >= 1 && draft.currentStep <= 4) {
      this.currentStep.set(draft.currentStep);
    }
    if (Array.isArray(draft.files) && draft.files.length > 0) {
      this.selectedFiles.set(draft.files);
    }
    if (
      (draft.assignments && draft.assignments.length > 0) ||
      (draft.selectedTeeth && draft.selectedTeeth.length > 0) ||
      (draft.files && draft.files.length > 0) ||
      draft.form?.patientName
    ) {
      this.hasRestoredDraft.set(true);
    }
  }

  async clearDraftStorage(): Promise<void> {
    await this.draftStorage.clearDraft();
    try { localStorage.removeItem('bakr_order_draft_v1'); } catch (e) { }
    this.assignments.set([]);
    this.selectedTeeth.set([]);
    this.selectedFiles.set([]);
    this.form.reset({
      patientName: '',
      patientGender: 'Male',
      patientAge: 30,
      requiredDeliveryDate: '',
      expressChecked: false,
      previewRequired: true,
      gumDesignChecked: false,
      implantHolesCount: 1,
      notes: '',
      serviceIds: []
    });
    this.currentStep.set(1);
    this.hasRestoredDraft.set(false);
    this.toast.info('تم مسح الجديد وتصفير كافة الحقول بنجاح');
  }

  /** I18N helpers: return name/description/category in the current app language */
  serviceName(s: ServiceDto): string {
    return this.i18n.currentLang() === 'ar' ? (s.nameAr || s.nameEn) : (s.nameEn || s.nameAr);
  }

  serviceDesc(s: ServiceDto): string {
    return this.i18n.currentLang() === 'ar' ? (s.descriptionAr || s.descriptionEn) : (s.descriptionEn || s.descriptionAr);
  }

  categoryLabel(cat: CategorizedGroup): string {
    return this.i18n.currentLang() === 'ar' ? cat.categoryAr : (cat.categoryEn || cat.categoryAr);
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

  /** Scope Management */
  selectScope(scope: 'tooth' | 'upper_arch' | 'lower_arch' | 'full_case'): void {
    this.activeScope.set(scope);
    if (scope !== 'tooth') {
      this.activeTooth.set(null);
    }
  }

  onTeethToggled(tooth: number): void {
    this.activeScope.set('tooth');
    this.activeTooth.set(tooth);
  }

  /** Called by odontogram (selectedTeethChange) — updates signal & sets active tooth */
  onOdontogramChange(teeth: number[]): void {
    const prev = this.selectedTeeth();
    this.selectedTeeth.set(teeth);
    // Identify the newly toggled tooth (added or removed)
    const added = teeth.find(t => !prev.includes(t));
    if (added !== undefined) {
      this.activeScope.set('tooth');
      this.activeTooth.set(added);
    } else if (teeth.length === 0) {
      this.activeTooth.set(null);
    }
  }

  /** Assign Service to Active Scope/Tooth */
  assignServiceToActiveTarget(service: ServiceDto): void {
    const selectedTeeth = this.selectedTeeth();
    const isPerToothLike = service.pricingMethod === PricingMethod.PerTooth || service.pricingMethod === PricingMethod.PerHole;
    const isPerArch = service.pricingMethod === PricingMethod.PerArch;
    const isQuotation = service.pricingMethod === PricingMethod.Quotation;
 
    if ((isPerToothLike || isPerArch) && selectedTeeth.length === 0) {
      this.toast.warning('يرجى تحديد سن أو أكثر من مخطط الأسنان أولاً لتطبيق هذه الخدمة');
      return;
    }
 
    const upperTeeth = selectedTeeth.filter(t => (t >= 11 && t <= 18) || (t >= 21 && t <= 28));
    const lowerTeeth = selectedTeeth.filter(t => (t >= 31 && t <= 38) || (t >= 41 && t <= 48));
    const assignmentsToAdd: ServiceAssignment[] = [];
 
    if (isPerToothLike) {
      assignmentsToAdd.push({
        id: Math.random().toString(36).substring(2, 9),
        service,
        targetType: 'tooth',
        teeth: [...selectedTeeth]
      });
    } else if (isPerArch) {
      if (upperTeeth.length > 0) {
        assignmentsToAdd.push({
          id: Math.random().toString(36).substring(2, 9),
          service,
          targetType: 'upper_arch',
          teeth: [...upperTeeth]
        });
      }
      if (lowerTeeth.length > 0) {
        assignmentsToAdd.push({
          id: Math.random().toString(36).substring(2, 9),
          service,
          targetType: 'lower_arch',
          teeth: [...lowerTeeth]
        });
      }
      if (assignmentsToAdd.length === 0) {
        this.toast.warning('يرجى تحديد أسنان علوية أو سفلية قبل تطبيق خدمة محسوبة على الفك');
        return;
      }
    } else if (isQuotation) {
      assignmentsToAdd.push({
        id: Math.random().toString(36).substring(2, 9),
        service,
        targetType: 'full_case',
        teeth: []
      });
    } else {
      assignmentsToAdd.push({
        id: Math.random().toString(36).substring(2, 9),
        service,
        targetType: 'full_case',
        teeth: []
      });
    }
 
    this.assignments.update(list => [...list, ...assignmentsToAdd]);
    if (selectedTeeth.length > 0) {
      this.selectedTeeth.set([]);
      this.activeTooth.set(null);
    }
    this.saveDraftToStorage();
    const addedCount = assignmentsToAdd.length;
    if (addedCount === 1) {
      this.toast.success(`تمت إضافة "${this.serviceName(service)}" بنجاح`);
    } else {
      this.toast.success(`تمت إضافة "${this.serviceName(service)}" في ${addedCount} أسطر`);
    }
  }


  /** Toggle a service ID in the 'serviceIds' form control (used in step 2 simple selection) */
  toggleServiceSelection(serviceId: string): void {
    const ctrl = this.form.get('serviceIds');
    if (!ctrl) return;
    const current: string[] = ctrl.value ?? [];
    const idx = current.indexOf(serviceId);
    if (idx === -1) {
      ctrl.setValue([...current, serviceId]);
    } else {
      ctrl.setValue(current.filter(id => id !== serviceId));
    }
    ctrl.markAsTouched();
    this.saveDraftToStorage();
  }

  removeAssignment(id: string): void {
    this.assignments.update(list => list.filter(a => a.id !== id));
    this.saveDraftToStorage();
  }

  clearAllAssignments(): void {
    this.assignments.set([]);
    this.saveDraftToStorage();
  }

  hasPerHoleService(): boolean {
    return this.assignments().some(a => a.service.pricingMethod === PricingMethod.PerHole);
  }

  requiredMinimumHours(): number {
    const assignedServices = this.assignments().map(a => a.service);
    if (!assignedServices.length) return 24;
    return Math.max(...assignedServices.map(s => s.minimumDeliveryHours || 24));
  }

  earliestAllowedDate(): Date {
    const hours = this.requiredMinimumHours();
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d;
  }

  formattedEarliestDate(): string {
    return this.earliestAllowedDate().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  }

  isDeliveryDateValid(): boolean {
    const dateVal = this.form.get('requiredDeliveryDate')?.value;
    if (!dateVal) return false;
    if (this.form.get('expressChecked')?.value) return true;
    const selected = new Date(dateVal);
    return selected.getTime() >= this.earliestAllowedDate().getTime();
  }

  /** Returns the correct display price for a single assignment line, respecting PricingMethod */
  getAssignmentItemPrice(a: ServiceAssignment): number {
    const s = a.service;
    const holes = this.form.get('implantHolesCount')?.value || 1;
    switch (s.pricingMethod) {
      case PricingMethod.PerTooth:
        return s.price * Math.max(1, a.teeth.length);
      case PricingMethod.PerArch:
        // Always flat per arch — quantity = 1 regardless of how many teeth stored
        return s.price;
      case PricingMethod.PerHole: {
        const qty = Math.max(1, holes);
        const rate = qty >= 4 ? s.price * 1.5 : s.price;
        return rate * qty;
      }
      case PricingMethod.Quotation:
        return 0;
      default:
        return s.price;
    }
  }

  pricingSummary(): { basePrice: number; expressFee: number; finalPrice: number } {
    const list    = this.assignments();
    const express = this.form.get('expressChecked')?.value || false;

    let basePrice = 0;
    list.forEach(a => { basePrice += this.getAssignmentItemPrice(a); });

    const expressFee = express ? basePrice * 0.5 : 0;
    return { basePrice, expressFee, finalPrice: basePrice + expressFee };
  }

  onFilesSelected(files: File[]): void {
    this.selectedFiles.set(files);
    this.saveDraftToStorage();
  }

  removeFile(index: number): void {
    this.selectedFiles.update(files => files.filter((_, i) => i !== index));
    this.saveDraftToStorage();
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
    if (step >= 1 && step <= this.currentStep()) {
      this.currentStep.set(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  stepTitle(step: number): string {
    switch (step) {
      case 1:
        return 'تحديد الأسنان والخدمات';
      case 2:
        return 'بيانات المريض وموعد التسليم';
      case 3:
        return 'رفع ملفات التصميم';
      case 4:
        return 'التأكيد النهائي للطلب';
      default:
        return '';
    }
  }

  isCurrentStepValid(): boolean {
    const step = this.currentStep();
    switch (step) {
      case 1:
        return this.assignments().length > 0;
      case 2:
        return !!(this.form.get('patientName')?.valid &&
          this.form.get('patientAge')?.valid &&
          this.form.get('patientGender')?.valid &&
          this.form.get('requiredDeliveryDate')?.valid &&
          this.isDeliveryDateValid());
      case 3:
        return this.selectedFiles().length > 0;
      default:
        return true;
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (this.assignments().length === 0) {
      this.toast.error('يرجى اختيار سن وحجم الخدمة المطلوبة أولاً');
      return;
    }
    if (this.selectedFiles().length === 0) {
      this.toast.error('يرجى رفع ملفات التصميم (STL/OBJ) الخاصة بالطلب');
      return;
    }
    if (!this.isDeliveryDateValid()) {
      this.toast.error(`لا يمكن استلام الطلب قبل ${this.formattedEarliestDate()} إلا في حالة الطلب المستعجل`);
      return;
    }

    const files = this.selectedFiles();
    this.uploadStates.set(files.map(f => ({ file: f, progress: 0, status: 'pending' })));
    this.uploadPhase.set('uploading');
    this.isUploading.set(true);

    const formVal = this.form.value;
    const assignmentsList = this.assignments();

    // Union of all selected teeth
    const allTeethSet = new Set<number>(this.selectedTeeth());
    assignmentsList.forEach(a => a.teeth.forEach(t => allTeethSet.add(t)));
    const allTeeth: number[] = Array.from(allTeethSet);

    // Service IDs
    const serviceIds = Array.from(new Set(assignmentsList.map(a => a.service.id)));

    // Service Selections payload
    const serviceSelections: OrderServiceSelection[] = assignmentsList.map(a => ({
      serviceId: a.service.id,
      teeth: a.teeth,
      targetType: a.targetType
    }));

    const payload: OrderCreateRequest = {
      patientName: formVal.patientName!,
      patientFileNumber: formVal.patientFileNumber || '',
      patientGender: formVal.patientGender!,
      patientAge: formVal.patientAge!,
      requiredDeliveryDate: new Date(formVal.requiredDeliveryDate!).toISOString(),
      expressChecked: formVal.expressChecked || false,
      previewRequired: formVal.previewRequired || false,
      gumDesignChecked: formVal.gumDesignChecked || false,
      selectedTeeth: allTeeth,
      serviceIds: serviceIds,
      serviceSelections: serviceSelections,
      notes: formVal.notes || ''
    };

    // 1. Create order
    this.orderService.createOrder(payload).subscribe({
      next: (order) => {
        // 2. Upload files
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
      this.uploadPhase.set('done');
      this.isUploading.set(false);
      this.draftStorage.clearDraft();
      try { localStorage.removeItem('bakr_order_draft_v1'); } catch (e) { }
      this.toast.success('تم رفع الملفات وإنشاء طلب التصميم بنجاح ✅');
      this.router.navigate(['/client/orders', orderId]);
      return;
    }

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
          this.uploadStates.update(states =>
            states.map((s, i) => i === index ? { ...s, progress: 100, status: 'done' } : s)
          );
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

  confirmExpressFromModal(): void {
    this.form.patchValue({ expressChecked: true });
    this.showExpressModal.set(false);
  }

  cancelExpressModal(): void {
    this.form.patchValue({ requiredDeliveryDate: '' });
    this.showExpressModal.set(false);
  }

  // ── Date picker helpers ──────────────────────────────────────────

  openDatePicker():  void { this.showDatePicker.set(true);  }
  closeDatePicker(): void { this.showDatePicker.set(false); }

  onDateConfirmed(evt: DateTimeConfirmEvent): void {
    this.form.patchValue({
      requiredDeliveryDate: evt.dateStr,
      expressChecked: evt.withExpress
    });
    this.showDatePicker.set(false);
  }

  formattedDeliveryDate(): string {
    const val = this.form.get('requiredDeliveryDate')?.value;
    if (!val) return '';
    return new Date(val).toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' });
  }

  // ── Service availability for current scope ───────────────────────

  toggleServiceDescription(serviceId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedServiceId.update(curr => curr === serviceId ? null : serviceId);
  }

  getPricingTermText(s: ServiceDto): string {
    const isAr = this.i18n.currentLang() === 'ar';
    switch (s.pricingMethod) {
      case PricingMethod.PerTooth:
        return isAr ? `تسعير بالسن: ${s.price} SAR لكل سن` : `Per Tooth: ${s.price} SAR / tooth`;
      case PricingMethod.PerHole:
        return isAr ? `تسعير بالزرعة/الفتحة: ${s.price} SAR لكل غرسة` : `Per Implant/Hole: ${s.price} SAR / hole`;
      case PricingMethod.PerArch:
        return isAr ? `تسعير بالفك: ${s.price} SAR للفك الواحد` : `Per Arch: ${s.price} SAR / arch`;
      case PricingMethod.Quotation:
        return isAr ? `بالتسعير (يحدد بعد مراجعة المعاينة)` : `Quotation required upon review`;
      default:
        return isAr ? `تسعير ثابت للحالة: ${s.price} SAR / حالة` : `Fixed per Case: ${s.price} SAR`;
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

  /** True if at least one service in the category is usable with the current scope */
  categoryHasAvailableServices(cat: { services: ServiceDto[] }): boolean {
    return cat.services.some(s => this.isServiceAvailableForScope(s));
  }

  isServiceAvailableForScope(service: ServiceDto): boolean {
    return true;
  }
}