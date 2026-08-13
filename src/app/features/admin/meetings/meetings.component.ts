import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MeetingService } from '../../../core/services/meeting.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../../core/services/auth.service';
import { MeetingRequestDto, MeetingStatus } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

function normalizeMeetingStatus(status: any): MeetingStatus {
  if (typeof status === 'number') return status as MeetingStatus;
  if (status === 'Pending' || status === 'pending') return MeetingStatus.Pending;
  if (status === 'Approved' || status === 'approved') return MeetingStatus.Approved;
  if (status === 'Rejected' || status === 'rejected') return MeetingStatus.Rejected;
  return MeetingStatus.Pending;
}

@Component({
  selector: 'app-meetings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './meetings.component.html',
  styleUrl: './meetings.component.scss'
})
export class MeetingsComponent implements OnInit {
  private readonly meetingService = inject(MeetingService);
  readonly i18n = inject(TranslationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(false);
  readonly meetings = signal<MeetingRequestDto[]>([]);

  readonly activeFilter = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // ── Modal state ────────────────────────────────────────────────────────────
  readonly selectedMeeting = signal<MeetingRequestDto | null>(null);
  readonly isModalOpen = signal(false);

  readonly isAdmin = computed(() => {
    const roles = this.auth.currentUser()?.roles ?? [];
    return roles.some(role => ['SuperAdmin', 'OperationsAdmin', 'FinancialAdmin', 'QualityAdmin'].includes(role));
  });

readonly filteredMeetings = computed(() => {
  const list = this.visibleMeetings();
  const filter = this.activeFilter();
  if (filter === 'pending')  return list.filter(m => m.status === MeetingStatus.Pending || Number(m.status) === 0);
  if (filter === 'approved') return list.filter(m => m.status === MeetingStatus.Approved || Number(m.status) === 1);
  if (filter === 'rejected') return list.filter(m => m.status === MeetingStatus.Rejected || Number(m.status) === 2);
  return list;
});

readonly pendingCount  = computed(() => this.visibleMeetings().filter(m => m.status === MeetingStatus.Pending || Number(m.status) === 0).length);
readonly approvedCount = computed(() => this.visibleMeetings().filter(m => m.status === MeetingStatus.Approved || Number(m.status) === 1).length);
  readonly isDesigner = computed(() => {
    const roles = this.auth.currentUser()?.roles ?? [];
    return roles.includes('Designer');
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const meetingId = params['meetingId'];
      if (meetingId && this.meetings().length > 0) {
        const found = this.meetings().find(m => m.id === meetingId || m.orderId === meetingId || m.meeting?.meetingRequestId === meetingId);
        if (found) {
          this.openModal(found);
        }
      }
    });
    this.loadMeetings();
  }

  loadMeetings(): void {
    this.isLoading.set(true);
    this.meetingService.getMeetings().subscribe({
      next: (res) => {
        const list = (res || []).map(m => ({ ...m, status: normalizeMeetingStatus(m.status) }));
        this.meetings.set(list);
        this.isLoading.set(false);
        // Auto-open modal if meetingId query param is present
        const meetingId = this.route.snapshot.queryParamMap.get('meetingId');
        if (meetingId) {
          const found = list.find(m => m.id === meetingId || m.orderId === meetingId || m.meeting?.meetingRequestId === meetingId);
          if (found) {
            this.openModal(found);
          }
        }
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to load meetings');
        this.isLoading.set(false);
      }
    });
  }

  openModal(meeting: MeetingRequestDto): void {
    this.selectedMeeting.set(meeting);
    this.isModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedMeeting.set(null);
    document.body.style.overflow = '';
  }

  // ── Approval Modal state ──────────────────────────────────────────────────
  readonly isApproveModalOpen = signal(false);
  readonly approveTarget = signal<MeetingRequestDto | null>(null);
  readonly approveMode = signal<'proposed' | 'custom'>('proposed');
  readonly customTime = signal<string>('');

  openApproveModal(meeting: MeetingRequestDto): void {
    this.approveTarget.set(meeting);
    this.approveMode.set('proposed');

    if (meeting.proposedTime) {
      const d = new Date(meeting.proposedTime);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
      this.customTime.set(localISOTime);
    } else {
      this.customTime.set('');
    }

    this.isApproveModalOpen.set(true);
  }

  closeApproveModal(): void {
    this.isApproveModalOpen.set(false);
    this.approveTarget.set(null);
  }

  confirmApprove(): void {
    const target = this.approveTarget();
    if (!target) return;

    let scheduledTimeISO: string | undefined = undefined;
    if (this.approveMode() === 'custom') {
      if (!this.customTime()) {
        this.toast.error(this.i18n.isRtl() ? 'يرجى اختيار الموعد الجديد' : 'Please select a custom scheduled time');
        return;
      }
      scheduledTimeISO = new Date(this.customTime()).toISOString();
    }

    this.isLoading.set(true);
    this.meetingService.approveMeeting(target.id, scheduledTimeISO).subscribe({
      next: () => {
        this.toast.success(this.i18n.isRtl() ? 'تمت الموافقة وجدولة الاجتماع بنجاح' : 'Meeting approved and scheduled');
        this.closeApproveModal();
        this.closeModal();
        this.loadMeetings();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to approve meeting');
        this.isLoading.set(false);
      }
    });
  }

  getJoinUrl(m: MeetingRequestDto): string | null {
    if (!m.meeting) return null;
    if (this.isDesigner()) {
      return m.meeting.designerJoinUrl || m.meeting.clientJoinUrl || null;
    }
    return m.meeting.clientJoinUrl || m.meeting.designerJoinUrl || null;
  }

  getStartUrl(m: MeetingRequestDto): string | null {
    return m.meeting?.startUrl || null;
  }

  getScheduledAt(m: MeetingRequestDto): string | null {
    return m.meeting?.scheduledAt || null;
  }

  getStatusBadgeClass(status: MeetingStatus): string {
    switch (status) {
      case MeetingStatus.Pending:  return 'status-pending';
      case MeetingStatus.Approved: return 'status-approved';
      case MeetingStatus.Rejected: return 'status-rejected';
      default: return 'status-unknown';
    }
  }

  getStatusLabel(status: MeetingStatus): string {
    if (this.i18n.isRtl()) {
      switch (status) {
        case MeetingStatus.Pending:  return 'قيد المراجعة';
        case MeetingStatus.Approved: return 'مقبول / مجدول';
        case MeetingStatus.Rejected: return 'مرفوض';
        default: return 'غير معروف';
      }
    } else {
      switch (status) {
        case MeetingStatus.Pending:  return 'Pending Review';
        case MeetingStatus.Approved: return 'Approved / Scheduled';
        case MeetingStatus.Rejected: return 'Rejected';
        default: return 'Unknown';
      }
    }
  }
  readonly currentUserId = computed(() => this.auth.currentUser()?.userId ?? null);

/** الطلبات المسموح للمستخدم الحالي يشوفها:
 *  - لو هو الطالب: يشوف كل الحالات (حتى المرفوضة)
 *  - لو الطرف التاني: يشوف المقبولة بس
 *  - الأدمن: يشوف كل حاجة زي ما هي
 */
readonly visibleMeetings = computed(() => {
  const list = this.meetings();
  if (this.isAdmin()) return list;

  const userId = this.currentUserId();
  return list.filter(m => {
    const isRequester = m.requestedByUserId === userId;
    if (isRequester) return true;
    return m.status === MeetingStatus.Approved;
  });
});
}
