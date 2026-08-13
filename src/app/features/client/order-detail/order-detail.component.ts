import { Component, OnInit, signal, inject, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { TranslationService } from '../../../core/services/translation.service';
import { MeetingService } from '../../../core/services/meeting.service';
import { OrderDto, OrderStatus, FileMetadataDto, getStatusActions, StatusAction, statusLabel, PAUSED_STATUSES } from '../../../core/models';
import { ThreeViewerComponent, FileInput } from '../../../shared/components/three-viewer/three-viewer.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { OdontogramComponent } from '../../../shared/components/odontogram/odontogram.component';
import { ToastService } from '../../../core/services/toast.service';

/** Convert API status (number OR string like "Draft") → numeric OrderStatus */
function normalizeOrderStatus(status: any): OrderStatus {
  if (typeof status === 'number') return status as OrderStatus;
  const key = status as keyof typeof OrderStatus;
  if (key in OrderStatus) return OrderStatus[key] as unknown as OrderStatus;
  return OrderStatus.Draft;
}
function normalizeOrder(o: any): OrderDto {
  return { ...o, status: normalizeOrderStatus(o.status) } as OrderDto;
}

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ThreeViewerComponent, BadgeComponent, OdontogramComponent],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss'
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly meetingService = inject(MeetingService);
  readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);
  public readonly OrderStatus = OrderStatus;

  readonly isLoading = signal(true);
  readonly isProcessing = signal(false);
  readonly order = signal<OrderDto | null>(null);

  readonly selectedThreeFile = signal<FileMetadataDto | null>(null);
  readonly activeFilesTab = signal<'client' | 'designer'>('client');
  // ── جديد: التبويب الرئيسي لصفحة تفاصيل الطلب (الخدمات/الملفات/بيانات المريض/التسعير) ──
  readonly activeMainTab = signal<'services' | 'files' | 'patient' | 'pricing'>('services');
  readonly selectedFileIds = signal<Set<string>>(new Set());  // New: track selected files
  readonly selectedServiceId = signal<string | null>(null);

  readonly activeServiceTeeth = computed<number[] | null>(() => {
    const svcId = this.selectedServiceId();
    if (!svcId) return null;
    const svc = (this.order()?.services || []).find(s => s.serviceId === svcId);
    return svc?.teeth && svc.teeth.length > 0 ? svc.teeth : null;
  });

  toggleServiceSelection(svcId: string): void {
    if (this.selectedServiceId() === svcId) {
      this.selectedServiceId.set(null);
    } else {
      this.selectedServiceId.set(svcId);
    }
  }

  // SLA Time state (نفس تصميم/منطق صفحة المصمم)
  readonly slaRemainingText = signal<string>('');
  readonly slaExpectedDueAt = signal<Date | null>(null);
  readonly slaProgressPercent = signal<number>(0);
  readonly slaIsPaused = signal<boolean>(false);
  readonly slaIsBreached = signal<boolean>(false);
  // Separate time parts for styled display
  readonly slaHours = signal<number>(0);
  readonly slaMinutes = signal<number>(0);
  readonly slaSeconds = signal<number>(0);
  private slaIntervalId?: any;

  // ── جديد: حالة رفع الملف الناقص وقت WaitingClientResponse ──
  readonly pendingFile = signal<File | null>(null);
  readonly isUploadingFile = signal(false);
  readonly hasUploadedFile = signal(false);
  readonly uploadError = signal<string>('');

  readonly clientActions = computed<StatusAction[]>(() => {
    const status = this.order()?.status;
    if (status === undefined) return [];
    if (
      status !== OrderStatus.WaitingClientReview &&
      status !== OrderStatus.DoctorReview &&
      status !== OrderStatus.WaitingClientResponse // ← جديد
    ) {
      return [];
    }
    return getStatusActions(status);
  });

  readonly clientOrderFiles = computed(() => {
    const files = this.order()?.files ?? [];
    return files.filter(file => ['input', 'cbct'].includes((file.category || '').toLowerCase()));
  });

  readonly clientResponseFiles = computed(() => {
    const files = this.order()?.files ?? [];
    return files.filter(file => ['client_response'].includes((file.category || '').toLowerCase()));
  });

  readonly designerPreviewFiles = computed(() => {
    const files = this.order()?.files ?? [];
    return files.filter(file => ['preview'].includes((file.category || '').toLowerCase()));
  });

  readonly designerFinalFiles = computed(() => {
    const files = this.order()?.files ?? [];
    return files.filter(file => ['final', 'screenshot'].includes((file.category || '').toLowerCase()));
  });

  readonly clientFiles = computed(() => [...this.clientOrderFiles(), ...this.clientResponseFiles()]);
  readonly designerFiles = computed(() => [...this.designerPreviewFiles(), ...this.designerFinalFiles()]);

  readonly selectedFiles = computed(() => {
    const selectedIds = this.selectedFileIds();
    const allFiles = [...this.clientFiles(), ...this.designerFiles()];
    return allFiles.filter(f => selectedIds.has(f.id));
  });

  readonly viewerFileInputs = computed(() => {
    const selectedFiles = this.selectedFiles();
    if (selectedFiles.length === 0) return [];

    const colors = [0x90caf9, 0xa5d6a7, 0xffcc80, 0xef9a9a, 0xf0f4c3];
    return selectedFiles.map((file, idx) => ({
      url: file.filePath,
      type: this.getFileExtension(file.fileName),
      label: file.fileName,
      color: colors[idx % colors.length]
    } as FileInput));
  });

  readonly canShowDesignerFiles = computed(() => {
    const status = this.order()?.status;
    return status === OrderStatus.Completed ||
      status === OrderStatus.ReadyForDownload ||
      status === OrderStatus.DoctorRevisionRequested ||
      status === OrderStatus.DoctorReview ||
      status === OrderStatus.WaitingClientReview;
  });

  readonly canDownloadFiles = computed(() =>
    this.canShowDesignerFiles()
  );

  toggleFileSelection(fileId: string): void {
    const current = new Set(this.selectedFileIds());
    if (current.has(fileId)) {
      current.delete(fileId);
    } else {
      current.add(fileId);
    }
    this.selectedFileIds.set(current);
  }

  isFileSelected(fileId: string): boolean {
    return this.selectedFileIds().has(fileId);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrder(id);
    }
  }

  ngOnDestroy(): void {
    if (this.slaIntervalId) {
      clearInterval(this.slaIntervalId);
    }
  }

  loadOrder(id: string): void {
    this.isLoading.set(true);
    this.orderService.getOrder(id).subscribe({
      next: (res) => {
        this.order.set(normalizeOrder(res));

        // الحالات اللي يُسمح فيها بعرض ملفات التصميم (نفس منطق canShowDesignerFiles)
        const allowedDesignerFileStatuses = [
          OrderStatus.Completed,
          OrderStatus.ReadyForDownload,
          OrderStatus.DoctorRevisionRequested,
          OrderStatus.DoctorReview,
          OrderStatus.WaitingClientReview
        ];

        const is3DFile = (f: FileMetadataDto) =>
          !f.isExternalLink &&
          ['stl', 'obj', 'ply'].includes(f.fileName.split('.').pop()?.toLowerCase() || '');

        let autoFile: FileMetadataDto | null = null;
        if (allowedDesignerFileStatuses.includes(res.status)) {
          // الأولوية للملف النهائي (final)، ولو مش موجود نرجع لملف المعاينة (preview)
          const finalFile = res.files.find(
            f => (f.category || '').toLowerCase() === 'final' && is3DFile(f)
          );
          const previewFile = res.files.find(
            f => (f.category || '').toLowerCase() === 'preview' && is3DFile(f)
          );
          autoFile = finalFile ?? previewFile ?? null;
        }
        this.selectedThreeFile.set(autoFile);

        // إذا فيه ملف تلقائي للاختبار/المعاينة، ضيفه لمجموعة الملفات المحددة عشان يظهر في العارض
        if (autoFile && autoFile.id) {
          const s = new Set(this.selectedFileIds());
          s.add(autoFile.id);
          this.selectedFileIds.set(s);
        } else {
          // نفضي التحديد الافتراضي
          this.selectedFileIds.set(new Set());
        }

        // إعادة ضبط حالة الرفع كل ما نحمل الأوردر من جديد
        this.pendingFile.set(null);
        this.hasUploadedFile.set(res.status !== OrderStatus.WaitingClientResponse ? false : this.hasUploadedFile());
        this.uploadError.set('');
        this.setupSlaTimer(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || 'stl';
  }

  /**
   * parseTime: بيحوّل ISO date string لـ timestamp.
   * ملحوظة مهمة: الباك إند بيرجع التواريخ من غير مؤشر Timezone (من غير Z في الآخر)،
   * ولو سبناها زي ما هي، الـ Date.parse بيفسرها كـ توقيت محلي للمتصفح مش UTC،
   * وده بيخلي حساب الوقت المتبقي غلط بفارق ساعتين/تلاتة حسب توقيت المستخدم.
   * فبنتأكد إننا نضيف Z تلقائيًا لو مفيش أي مؤشر timezone في الـ string.
   */
  private parseTime(value: string | null | undefined): number {
    if (!value) return NaN;
    const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? NaN : parsed;
  }

  setupSlaTimer(order: OrderDto): void {
    if (this.slaIntervalId) clearInterval(this.slaIntervalId);

    this.slaIsPaused.set(false);
    this.slaIsBreached.set(false);

    if (!order.slaTracking?.dueAt || order.status === OrderStatus.Completed) {
      this.slaRemainingText.set('');
      this.slaExpectedDueAt.set(null);
      this.slaProgressPercent.set(0);
      return;
    }

    const startTime = this.parseTime(order.slaTracking?.startedAt);

    const computeExpectedTime = () => {
      const dueTime = this.parseTime(order.slaTracking!.dueAt!);
      if (Number.isNaN(dueTime)) {
        return NaN;
      }

      const totalPausedMs = (order.slaTracking?.totalPausedMinutes ?? 0) * 60 * 1000;
      const currentPausedMs = order.slaTracking?.pausedAt && PAUSED_STATUSES.has(order.status)
        ? Math.max(0, Date.now() - this.parseTime(order.slaTracking.pausedAt))
        : 0;

      return dueTime + totalPausedMs + currentPausedMs;
    };

    const updateProgress = (expectedTime: number) => {
      if (Number.isNaN(startTime) || Number.isNaN(expectedTime) || expectedTime <= startTime) {
        this.slaProgressPercent.set(0);
        return;
      }
      const total = expectedTime - startTime;
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
      this.slaProgressPercent.set(pct);
    };

    const expectedTime = computeExpectedTime();
    this.slaExpectedDueAt.set(Number.isNaN(expectedTime) ? null : new Date(expectedTime));
    updateProgress(expectedTime);

    if (PAUSED_STATUSES.has(order.status)) {
      this.slaIsPaused.set(true);
      this.slaRemainingText.set(this.i18n.currentLang() === 'ar' ? 'متوقف مؤقتًا' : 'Paused');
      return;
    }

    const updateTimer = () => {
      const expectedTime = computeExpectedTime();
      if (Number.isNaN(expectedTime)) {
        this.slaRemainingText.set('');
        this.slaExpectedDueAt.set(null);
        this.slaProgressPercent.set(0);
        return;
      }

      this.slaExpectedDueAt.set(new Date(expectedTime));
      updateProgress(expectedTime);
      const diff = expectedTime - Date.now();

      if (diff <= 0) {
        this.slaIsBreached.set(true);
        this.slaProgressPercent.set(100);
        this.slaRemainingText.set(this.i18n.currentLang() === 'ar' ? 'انتهت المهلة' : 'Breached');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      // update separate parts for styled display
      this.slaHours.set(hours);
      this.slaMinutes.set(mins);
      this.slaSeconds.set(secs);
      this.slaRemainingText.set(`${hours}h ${mins}m ${secs}s`);
    };

    updateTimer();
    this.slaIntervalId = setInterval(updateTimer, 1000);
  }

  /**
   * يحدد شدة حالة الـ SLA الحالية عشان نلوّن الويدجت بشكل مناسب:
   * breached: تم تجاوز الموعد | paused: العداد متوقف مؤقتًا
   * critical: أوشك على الانتهاء (>= 85% من الوقت المستهلك) | normal: باقي وقت كافي
   */
  slaSeverity(): 'breached' | 'paused' | 'critical' | 'normal' {
    if (this.slaIsBreached()) return 'breached';
    if (this.slaIsPaused()) return 'paused';
    if (this.slaProgressPercent() >= 85) return 'critical';
    return 'normal';
  }

  slaColorClasses(): { badge: string; icon: string; value: string; bar: string } {
    switch (this.slaSeverity()) {
      case 'breached':
        return { badge: 'bg-red-50 border-red-200', icon: 'bg-red-100 text-red-600', value: 'text-red-600', bar: 'bg-red-500' };
      case 'paused':
        return { badge: 'bg-slate-50 border-slate-200', icon: 'bg-slate-200 text-slate-500', value: 'text-slate-500', bar: 'bg-slate-400' };
      case 'critical':
        return { badge: 'bg-orange-50 border-orange-200', icon: 'bg-orange-100 text-orange-600', value: 'text-orange-600', bar: 'bg-orange-500' };
      default:
        return { badge: 'bg-emerald-50 border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-700', bar: 'bg-emerald-500' };
    }
  }

  // ── جديد: اختيار الملف من الجهاز (لسه ما اترفعش) ──
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pendingFile.set(file);
    this.hasUploadedFile.set(false);
    this.uploadError.set('');
  }

  // ── جديد: رفع الملف الناقص فعليًا لسيرفر ──
  uploadMissingFile(): void {
    const file = this.pendingFile();
    const order = this.order();
    if (!file || !order) return;

    this.isUploadingFile.set(true);
    this.uploadError.set('');

    // ملحوظة: عدّل اسم الميثود دي لو OrderService عندك مسمّيها حاجة تانية.
    // المفروض تبعت POST /api/v1/Orders/{id}/files?category=client_response
    this.orderService.uploadFile(order.id, file, 'client_response').subscribe({
      next: () => {
        this.isUploadingFile.set(false);
        this.hasUploadedFile.set(true);
        // نحدث بيانات الأوردر عشان الملف الجديد يظهر في القايمة فورًا
        this.loadOrder(order.id);
      },
      error: (err: any) => {
        this.isUploadingFile.set(false);
        this.hasUploadedFile.set(false);
        this.uploadError.set(err.error?.message || 'فشل رفع الملف، حاول مرة أخرى');
      }
    });
  }

  handleAction(action: StatusAction): void {
    if (!this.order() || this.isProcessing()) return;

    // ── جديد: يمنع الإرسال للإدارة لو لسه ملف ما اترفعش ──
    if (action.requiresFile && !this.hasUploadedFile()) {
      alert('يرجى رفع الملف الناقص أولاً قبل الإرسال للإدارة');
      return;
    }

    let notes = action.style === 'success'
      ? 'تمت الموافقة من قبل الطبيب/العميل'
      : 'تم اتخاذ إجراء من قبل الطبيب/العميل';

    if (action.requiresNotes) {
      const input = prompt('يرجى إدخال سبب طلب التعديل بالتفصيل:');
      if (input === null) return;
      if (!input.trim()) {
        this.orderService.getOrder(this.order()!.id);
        alert('يجب إدخال سبب لإتمام هذا الإجراء');
        return;
      }
      notes = input.trim();
    }

    this.isProcessing.set(true);
    this.orderService.updateStatus(this.order()!.id, { status: action.next, notes }).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.pendingFile.set(null);
        this.hasUploadedFile.set(false);
        this.loadOrder(this.order()!.id);
      },
      error: (err) => {
        this.isProcessing.set(false);
        alert(err.error?.message || 'فشل تنفيذ الإجراء، يرجى المحاولة مرة أخرى');
      }
    });
  }

  getActionButtonClass(style: StatusAction['style']): string {
    switch (style) {
      case 'primary': return 'bg-primary text-white hover:bg-primary-dark';
      case 'success': return 'bg-green-600 text-white hover:bg-green-700';
      case 'danger': return 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100';
      case 'neutral': return 'bg-surface border border-border text-secondary hover:bg-background';
      default: return 'bg-surface border border-border text-secondary hover:bg-background';
    }
  }

  getStatusBadge(status: OrderStatus): 'success' | 'warning' | 'danger' | 'primary' | 'info' {
    switch (status) {
      case OrderStatus.Completed:
      case OrderStatus.ApprovedByQuality:
      case OrderStatus.ReadyForDownload:
        return 'success';
      case OrderStatus.Cancelled:
      case OrderStatus.RejectedByQuality:
      case OrderStatus.LabRejected:
      case OrderStatus.DoctorRevisionRequested:
        return 'danger';
      case OrderStatus.InDesign:
      case OrderStatus.QualityReview:
        return 'primary';
      case OrderStatus.WaitingClientReview:
      case OrderStatus.DoctorReview:
      case OrderStatus.WaitingDoctorResponse:
      case OrderStatus.WaitingLabResponse:
      case OrderStatus.WaitingAdminResponse:
      case OrderStatus.WaitingClientResponse: // ← جديد
      case OrderStatus.ReturnedToDesigner:
        return 'warning';
      default:
        return 'info';
    }
  }

  getStatusLabel(status: OrderStatus): string {
    return statusLabel(status);
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }

  approveQuotation(): void {
    const order = this.order();
    if (!order || this.isProcessing()) return;

    if (confirm(this.i18n.currentLang() === 'ar' ? 'هل أنت موافق على السعر وسيتم خصم التكلفة من محفظتك؟' : 'Are you sure you want to approve this price? The cost will be debited from your wallet.')) {
      this.isProcessing.set(true);
      this.orderService.approveQuotation(order.id).subscribe({
        next: () => {
          this.toast.success(this.i18n.currentLang() === 'ar' ? 'تمت الموافقة ودفع القيمة بنجاح!' : 'Quotation approved and paid successfully!');
          this.isProcessing.set(false);
          this.loadOrder(order.id);
        },
        error: (err) => {
          this.isProcessing.set(false);
          this.toast.error(err.error?.message || 'فشل إتمام العملية. تأكد من رصيد محفظتك.');
        }
      });
    }
  }

  requestMeeting(): void {
    const orderId = this.order()?.id;
    if (!orderId) return;

    const dateStr = prompt(
      this.i18n.currentLang() === 'ar'
        ? 'يرجى إدخال التاريخ والوقت المقترح (مثال: YYYY-MM-DD HH:MM):'
        : 'Please enter proposed date & time (format: YYYY-MM-DD HH:MM):',
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
    );
    if (!dateStr) return;

    const reason = prompt(
      this.i18n.currentLang() === 'ar'
        ? 'يرجى كتابة سبب أو تفاصيل الاجتماع المطلوبة:'
        : 'Please enter reason or discussion details for this meeting:'
    );
    if (!reason?.trim()) {
      alert(this.i18n.currentLang() === 'ar' ? 'يجب إدخال سبب لطلب الاجتماع' : 'Reason is required');
      return;
    }

    const proposedTime = new Date(dateStr.replace(' ', 'T')).toISOString();

    this.isProcessing.set(true);
    this.meetingService.requestMeeting({ orderId, proposedTime, reason }).subscribe({
      next: () => {
        this.toast.success(
          this.i18n.currentLang() === 'ar'
            ? 'تم تقديم طلب الاجتماع بنجاح بانتظار موافقة الأدمن'
            : 'Meeting request sent successfully, pending Admin approval'
        );
        this.isProcessing.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to request meeting');
        this.isProcessing.set(false);
      }
    });
  }
}