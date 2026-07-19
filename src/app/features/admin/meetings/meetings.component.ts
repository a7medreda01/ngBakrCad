import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MeetingService } from '../../../core/services/meeting.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../../core/services/auth.service';
import { MeetingRequestDto, MeetingStatus } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

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
    return roles.some(role => ['SuperAdmin', 'OperationsAdmin'].includes(role));
  });

  readonly filteredMeetings = computed(() => {
    const list = this.meetings();
    const filter = this.activeFilter();
    if (filter === 'pending')  return list.filter(m => m.status === MeetingStatus.Pending);
    if (filter === 'approved') return list.filter(m => m.status === MeetingStatus.Approved);
    if (filter === 'rejected') return list.filter(m => m.status === MeetingStatus.Rejected);
    return list;
  });

  readonly pendingCount  = computed(() => this.meetings().filter(m => m.status === MeetingStatus.Pending).length);
  readonly approvedCount = computed(() => this.meetings().filter(m => m.status === MeetingStatus.Approved).length);

  ngOnInit(): void {
    this.loadMeetings();
  }

  loadMeetings(): void {
    this.isLoading.set(true);
    this.meetingService.getMeetings().subscribe({
      next: (res) => {
        this.meetings.set(res || []);
        this.isLoading.set(false);
        // Auto-open modal if meetingId query param is present
        const meetingId = this.route.snapshot.queryParamMap.get('meetingId');
        if (meetingId) {
          const found = (res || []).find(m => m.id === meetingId);
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

  approve(meeting: MeetingRequestDto): void {
    const confirmMsg = this.i18n.isRtl()
      ? 'هل أنت متأكد من رغبتك في الموافقة على هذا الاجتماع وجدولته على زووم؟'
      : 'Approve this meeting and schedule it on Zoom?';
    if (!confirm(confirmMsg)) return;

    this.isLoading.set(true);
    this.meetingService.approveMeeting(meeting.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.isRtl() ? 'تمت الموافقة وجدولة الاجتماع بنجاح' : 'Meeting approved and scheduled');
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
    return m.meeting?.joinUrl || null;
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
}
