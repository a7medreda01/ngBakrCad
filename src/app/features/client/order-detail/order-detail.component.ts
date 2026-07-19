import { Component, OnInit, signal, inject, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { TranslationService } from '../../../core/services/translation.service';
import { MeetingService } from '../../../core/services/meeting.service';
import { OrderDto, OrderStatus, FileMetadataDto, getStatusActions, StatusAction, statusLabel, PAUSED_STATUSES } from '../../../core/models';
import { ThreeViewerComponent } from '../../../shared/components/three-viewer/three-viewer.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { OdontogramComponent } from '../../../shared/components/odontogram/odontogram.component';
import { ToastService } from '../../../core/services/toast.service';

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

  readonly slaRemainingText = signal<string>('');
  readonly slaExpectedDueAt = signal<Date | null>(null);
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

  readonly canDownloadFiles = computed(() =>
    this.order()?.status === OrderStatus.ReadyForDownload ||
    this.order()?.status === OrderStatus.Completed
  );

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
        this.order.set(res);
        const file = res.files.find(f => ['stl', 'obj', 'ply'].includes(f.fileName.split('.').pop() || ''));
        if (file) {
          this.selectedThreeFile.set(file);
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

setupSlaTimer(order: OrderDto): void {
  if (this.slaIntervalId) clearInterval(this.slaIntervalId);

  if (!order.slaTracking?.dueAt || order.status === OrderStatus.Completed) {
    this.slaRemainingText.set('');
    this.slaExpectedDueAt.set(null);
    return;
  }

  const parseTime = (value: string | null | undefined): number => {
    const parsed = value ? Date.parse(value) : NaN;
    return Number.isNaN(parsed) ? NaN : parsed;
  };

  const computeExpectedTime = () => {
    const dueTime = parseTime(order.slaTracking!.dueAt!);
    if (Number.isNaN(dueTime)) {
      return NaN;
    }

    const totalPausedMs = (order.slaTracking?.totalPausedMinutes ?? 0) * 60 * 1000;
    const currentPausedMs = order.slaTracking?.pausedAt && PAUSED_STATUSES.has(order.status)
      ? Math.max(0, Date.now() - parseTime(order.slaTracking.pausedAt))
      : 0;

    return dueTime + totalPausedMs + currentPausedMs;
  };

  const expectedTime = computeExpectedTime();
  this.slaExpectedDueAt.set(Number.isNaN(expectedTime) ? null : new Date(expectedTime));

  if (PAUSED_STATUSES.has(order.status)) {
    this.slaRemainingText.set(this.i18n.currentLang() === 'ar' ? '⏸️ متوقف مؤقتًا' : '⏸️ Paused');
    return;
  }

  const updateTimer = () => {
    const expectedTime = computeExpectedTime();
    if (Number.isNaN(expectedTime)) {
      this.slaRemainingText.set('');
      this.slaExpectedDueAt.set(null);
      return;
    }

    this.slaExpectedDueAt.set(new Date(expectedTime));
    const diff = expectedTime - Date.now();

    if (diff <= 0) {
      this.slaRemainingText.set(this.i18n.currentLang() === 'ar' ? 'انتهت المهلة' : 'Breached');
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    this.slaRemainingText.set(`${hours}h ${mins}m ${secs}s`);
  };

  updateTimer();
  this.slaIntervalId = setInterval(updateTimer, 1000);
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