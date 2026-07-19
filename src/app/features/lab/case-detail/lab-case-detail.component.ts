import { Component, OnInit, signal, inject, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DesignerService } from '../../../core/services/designer.service';
import { OrderStatus } from '../../../core/enums';
import { TranslationService } from '../../../core/services/translation.service';
import { OrderDto, FileMetadataDto, PAUSED_STATUSES } from '../../../core/models';
import { ThreeViewerComponent } from '../../../shared/components/three-viewer/three-viewer.component';
import { ToastService } from '../../../core/services/toast.service';
import { OdontogramComponent } from '../../../shared/components/odontogram/odontogram.component';
import { MeetingService } from '../../../core/services/meeting.service';


@Component({
  selector: 'app-lab-case-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ThreeViewerComponent, OdontogramComponent],
  templateUrl: './lab-case-detail.component.html',
  styleUrl: './lab-case-detail.component.scss'
})
export class LabCaseDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly designerService = inject(DesignerService);
  readonly i18n = inject(TranslationService);
  private readonly meetingService = inject(MeetingService);
  public readonly OrderStatus = OrderStatus;
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(true);
  readonly order = signal<OrderDto | null>(null);

  // Selected file for 3D Viewer
  readonly selectedThreeFile = signal<FileMetadataDto | null>(null);
  readonly activeFilesTab = signal<'client' | 'designer'>('client');

  // SLA Time state
  readonly slaRemainingText = signal<string>('');
  readonly slaExpectedDueAt = signal<Date | null>(null);
  private slaIntervalId?: any;

  // File uploads
  readonly isUploading = signal(false);

  // --- محلي بس (مش بيتبعت للباك إند) عشان نظهر زرار القبول/الرفض
  // بعد ما المصمم يضغط "بدء المراجعة"، من غير ما نغيّر حالة الأوردر فعليًا في الداتابيز،
  // لأن الـ Accept/Reject endpoints في الباك إند بتشترط إن الحالة لسه AssignedToLab.
  readonly reviewStarted = signal(false);

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
    this.designerService.getOrderDetail(id).subscribe({
      next: (res) => {
        this.order.set(res);
        // أي تحميل جديد للأوردر يصفّر حالة "بدء المراجعة" المحلية
        this.reviewStarted.set(false);
        // Find 3D file to preview
        const file = res.files.find(f => ['stl', 'obj', 'ply'].includes(f.fileName.split('.').pop() || ''));
        if (file) {
          this.selectedThreeFile.set(file);
        }
        this.setupSlaTimer(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('فشل تحميل تفاصيل الحالة');
      }
    });
  }

  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || 'stl';
  }

setupSlaTimer(order: OrderDto): void {
  if (this.slaIntervalId) clearInterval(this.slaIntervalId);

  const parseTime = (value: string | null | undefined): number => {
    const parsed = value ? Date.parse(value) : NaN;
    return Number.isNaN(parsed) ? NaN : parsed;
  };

  if (!order.slaTracking?.dueAt || order.status === OrderStatus.Completed) {
    this.slaRemainingText.set('');
    this.slaExpectedDueAt.set(null);
    return;
  }

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

  /**
   * بدء المراجعة إجراء محلي (UI فقط) بيكشف زرار القبول/الرفض،
   * من غير ما يستدعي الباك إند، عشان نحافظ على إن حالة الأوردر تفضل AssignedToLab
   * لحد ما المصمم يقبل أو يرفض فعليًا (مطلوب من /accept و /reject في الباك إند).
   */
  startReview(): void {
    if (!this.order() || this.isLoading()) return;
    this.reviewStarted.set(true);
  }

  /**
   * --- معدّل: تمت إضافة حراسة `|| this.isLoading()` ---
   * ده بيمنع إرسال أكتر من طلب Accept في نفس الوقت (Double-Click / Double-Submit)،
   * وهو السبب الرئيسي في ظهور DbUpdateConcurrencyException في الباك إند
   * (الطلب الأول ينجح ويغيّر RowVersion، والطلب الثاني بيوصل بنفس RowVersion القديم فيفشل).
   * الفحص جوه الميثود مضمون وفوري، على عكس [disabled]="isLoading()" في الـ template
   * اللي ممكن يتأخر جزء من الثانية عن الضغطة الفعلية.
   */
  acceptOrder(): void {
    if (!this.order() || this.isLoading()) return;
    this.isLoading.set(true);
    this.designerService.acceptOrder(this.order()!.id).subscribe({
      next: () => {
        this.toast.success('تم قبول التكليف، اضغط "بدء التصميم" للبدء في العمل على الحالة');
        this.loadOrder(this.order()!.id);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'فشل قبول التكليف');
      }
    });
  }

  /**
   * --- معدّل: تمت إضافة حراسة `|| this.isLoading()` لنفس سبب acceptOrder ---
   */
  rejectOrder(): void {
    if (!this.order() || this.isLoading()) return;
    const reason = prompt('يرجى إدخال سبب الرفض بالتفصيل:');
    if (reason === null) return;
    if (!reason.trim()) {
      this.toast.error('يجب تقديم سبب للرفض');
      return;
    }

    this.isLoading.set(true);
    this.designerService.rejectOrder(this.order()!.id, reason).subscribe({
      next: () => {
        this.toast.warning('تم رفض تكليف الحالة وإعادتها للإدارة');
        this.router.navigate(['/lab/cases']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'فشل رفض تكليف الحالة');
      }
    });
  }

  /**
   * بعد قبول الحالة (LabAccepted)، المصمم يضغط هنا عشان يبدأ فعليًا في التصميم
   * وتتحول حالة الأوردر لـ InDesign، وده اللي بيفتح لوحة رفع الملفات تحت.
   * --- معدّل: تمت إضافة حراسة `|| this.isLoading()` ---
   */
  startDesign(): void {
    if (!this.order() || this.isLoading()) return;
    this.isLoading.set(true);
    this.designerService.updateOrderStatus(this.order()!.id, { status: OrderStatus.InDesign, notes: 'بدء العمل الفعلي على التصميم' }).subscribe({
      next: () => {
        this.toast.success('تم بدء التصميم، يمكنك الآن رفع ملفات الحالة');
        this.loadOrder(this.order()!.id);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'فشل بدء التصميم');
      }
    });
  }

  /**
   * --- معدّل: تمت إضافة حراسة `|| this.isUploading()` لمنع رفع نفس الملف مرتين
   * لو المستخدم ضغط بسرعة على input الملف أكتر من مرة ---
   */
  onFileSelected(event: any, category: 'final' | 'screenshot' | 'preview'): void {
    if (this.isUploading()) return;

    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    this.isUploading.set(true);
    this.uploadFilesSequentially(this.order()!.id, Array.from(files), category, 0);
  }

  private uploadFilesSequentially(orderId: string, files: File[], category: 'final' | 'screenshot' | 'preview', index: number): void {
    if (index >= files.length) {
      this.isUploading.set(false);
      this.toast.success('تم رفع كافة الملفات بنجاح ✅');
      this.loadOrder(orderId);
      return;
    }

    const currentFile = files[index];
    this.designerService.uploadDesignFile(orderId, currentFile, category).subscribe({
      next: () => {
        this.uploadFilesSequentially(orderId, files, category, index + 1);
      },
      error: (err) => {
        this.isUploading.set(false);
        this.toast.error(err.error?.message || `فشل رفع الملف: ${currentFile.name}`);
        this.loadOrder(orderId);
      }
    });
  }

  /**
   * --- معدّل: تمت إضافة حراسة `|| this.isLoading()` ---
   */
  submitForQuality(): void {
    if (!this.order() || this.isLoading()) return;
    const hasFinalFile = this.order()!.files.some(f => f.category === 'final');
    if (!hasFinalFile) {
      this.toast.error('يرجى رفع ملف التصميم النهائي (STL/OBJ) أولاً');
      return;
    }

    this.isLoading.set(true);
    this.designerService.updateOrderStatus(this.order()!.id, { status: OrderStatus.QualityReview, notes: 'تقديم التصميم للفحص والمراجعة' }).subscribe({
      next: () => {
        this.toast.success('تم تقديم التصميم بنجاح لمراجعة الجودة QA');
        this.loadOrder(this.order()!.id);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'فشل تقديم التصميم للمراجعة');
      }
    });
  }

  /**
   * --- معدّل: تمت إضافة حراسة `|| this.isLoading()` ---
   */
  askAdminHelp(): void {
    if (!this.order() || this.isLoading()) return;
    const msg = prompt('يرجى إدخال سؤالك أو المشكلة للأدمن:');
    if (msg === null) return;
    if (!msg.trim()) return;

    this.isLoading.set(true);
    this.designerService.updateOrderStatus(this.order()!.id, { status: OrderStatus.WaitingAdminResponse, notes: msg }).subscribe({
      next: () => {
        this.toast.success('تم تعليق الحالة وإرسال استفسارك للأدمن بنجاح');
        this.loadOrder(this.order()!.id);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'فشل إرسال الاستفسار');
      }
    });
  }

  selectFileForPreview(file: FileMetadataDto): void {
    const ext = file.fileName.split('.').pop()?.toLowerCase();
    if (ext && ['stl', 'obj', 'ply'].includes(ext)) {
      this.selectedThreeFile.set(file);
    } else {
      this.toast.error('الملف المحدد ليس بصيغة ثلاثية أبعاد صالحة للمشاهدة');
    }
  }
resumeDesign(): void {
  if (!this.order() || this.isLoading()) return;
  this.isLoading.set(true);
  this.designerService.updateOrderStatus(this.order()!.id, { status: OrderStatus.InDesign, notes: 'استئناف العمل على التعديلات المطلوبة من الجودة' }).subscribe({
    next: () => {
      this.toast.success('تم استئناف التصميم، يمكنك الآن رفع التعديلات المطلوبة');
      this.loadOrder(this.order()!.id);
    },
    error: (err) => {
      this.isLoading.set(false);
      this.toast.error(err.error?.message || 'فشل استئناف التصميم');
    }
  });
}
  downloadFile(file: FileMetadataDto): void {
    if (!file.filePath) {
      this.toast.error('رابط الملف غير متاح');
      return;
    }
    window.open(file.filePath, '_blank');
  }

  getStatusBadge(status: number): 'success' | 'warning' | 'danger' | 'primary' | 'info' {
    switch (status) {
      case OrderStatus.Completed: return 'success';
      case OrderStatus.LabRejected:
      case OrderStatus.RejectedByQuality: return 'danger';
      case OrderStatus.InDesign:
      case OrderStatus.QualityReview: return 'primary';
      case OrderStatus.AssignedToLab:
      case OrderStatus.LabReview:
      case OrderStatus.LabAccepted: return 'warning';
      default: return 'info';
    }
  }

  getStatusLabel(status: number): string {
    const labels: Record<number, string> = {
      [OrderStatus.Draft]: 'مسودة',
      [OrderStatus.WaitingClientReview]: 'انتظار مراجعة الإدارة',
      [OrderStatus.AssignedToLab]: 'تم الإسناد إليك (بانتظار المراجعة)',
      [OrderStatus.LabReview]: 'قيد مراجعتك وقبولك',
      [OrderStatus.LabRejected]: 'مرفوض من قبلك',
      [OrderStatus.LabAccepted]: 'مقبول من قبلك (بانتظار بدء التصميم)',
      [OrderStatus.WaitingAdminResponse]: 'بانتظار رد الإدارة',
      [OrderStatus.InDesign]: 'قيد التصميم والعمل',
      [OrderStatus.QualityReview]: 'قيد مراجعة الجودة QA',
      [OrderStatus.ReturnedToDesigner]: 'مسترجع للتعديل من الجودة',
      [OrderStatus.RejectedByQuality]: 'مرفوض من الجودة',
      [OrderStatus.ApprovedByQuality]: 'مقبول من الجودة',
      [OrderStatus.DoctorReview]: 'طلب تعديل من العميل',
      [OrderStatus.WaitingDoctorResponse]: 'جاهز للتحميل',
      [OrderStatus.Completed]: 'مكتمل',
      [OrderStatus.Cancelled]: 'ملغي'
    };
    return labels[status] || 'غير معروف';
  }
  // إضافة signals جديدة لإدارة حالة رفع المعاينة
readonly previewMode = signal<'file' | 'link'>('file');
readonly previewLink = signal('');
readonly isUploadingPreview = signal(false);
/**
 * رفع ملف معاينة (STL/صورة/PDF...)
 */
onPreviewFileSelected(event: any): void {
  if (this.isUploadingPreview()) return;

  const file = event.target.files[0];
  if (!file) return;

  this.isUploadingPreview.set(true);
  this.designerService.uploadPreviewFile(this.order()!.id, { file }).subscribe({
    next: () => {
      this.isUploadingPreview.set(false);
      this.toast.success('تم رفع ملف المعاينة بنجاح');
      this.loadOrder(this.order()!.id);
    },
    error: (err) => {
      this.isUploadingPreview.set(false);
      this.toast.error(err.error?.message || 'فشل رفع ملف المعاينة');
    }
  });
}

/**
 * إرسال رابط خارجي للمعاينة (بدل رفع ملف)
 */
submitPreviewLink(): void {
  if (this.isUploadingPreview()) return;

  const link = this.previewLink().trim();
  if (!link) {
    this.toast.error('يرجى إدخال رابط صالح للمعاينة');
    return;
  }

  try {
    const url = new URL(link);
    if (!['http:', 'https:'].includes(url.protocol)) {
      this.toast.error('الرابط يجب أن يبدأ بـ http:// أو https://');
      return;
    }
  } catch {
    this.toast.error('الرابط المدخل غير صالح');
    return;
  }

  this.isUploadingPreview.set(true);
  this.designerService.uploadPreviewFile(this.order()!.id, { externalLink: link }).subscribe({
    next: () => {
      this.isUploadingPreview.set(false);
      this.previewLink.set('');
      this.toast.success('تم إضافة رابط المعاينة بنجاح');
      this.loadOrder(this.order()!.id);
    },
    error: (err) => {
      this.isUploadingPreview.set(false);
      this.toast.error(err.error?.message || 'فشل إضافة رابط المعاينة');
    }
  });
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

  this.isLoading.set(true);
  this.meetingService.requestMeeting({ orderId, proposedTime, reason }).subscribe({
    next: () => {
      this.toast.success(
        this.i18n.currentLang() === 'ar'
          ? 'تم تقديم طلب الاجتماع بنجاح بانتظار موافقة الأدمن'
          : 'Meeting request sent successfully, pending Admin approval'
      );
      this.isLoading.set(false);
    },
    error: (err) => {
      this.toast.error(err.error?.message || 'Failed to request meeting');
      this.isLoading.set(false);
    }
  });
}
}