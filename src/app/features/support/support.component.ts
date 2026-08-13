import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SupportService } from '../../core/services/support.service';
import { TranslationService } from '../../core/services/translation.service';
import { TicketStatus, TicketType } from '../../core/enums';
import { AddMessageRequest, CreateTicketRequest, FaqDto, SupportMessageDto, SupportTicketDto, SupportTicketListDto } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss'
})
export class SupportComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly translationService = inject(TranslationService);
  private readonly supportService = inject(SupportService);

  readonly faqs = signal<FaqDto[]>([]);
  readonly tickets = signal<SupportTicketDto[]>([]);
  readonly ticketsList = signal<SupportTicketListDto[]>([]);
  readonly selectedTicket = signal<SupportTicketDto | null>(null);
  readonly selectedTicketMessages = signal<SupportMessageDto[]>([]);
  // mapped sender/receiver names for the selected ticket (from list endpoint)
  readonly selectedTicketSender = signal<string>('');
  readonly selectedTicketReceiver = signal<string>('');
  readonly activeTab = signal<'faqs' | 'tickets' | 'manage'>('faqs');
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly isReplying = signal(false);
  readonly isAdmin = computed(() => {
    const roles = this.authService.currentUser()?.roles ?? [];
    return roles.some(role => ['SuperAdmin', 'FinancialAdmin', 'OperationsAdmin', 'QualityAdmin'].includes(role));
  });

  // Expose enum to template
  readonly TicketStatus = TicketStatus;

  readonly newTicket = signal<CreateTicketRequest>({
    title: '',
    category: TicketType.Inquiry,
    initialMessage: ''
  });

  readonly replyForm = signal<{ messageBody: string; attachment: File | null }>({
    messageBody: '',
    attachment: null
  });

  readonly faqForm = signal<{ id: string; category: string; questionAr: string; questionEn: string; answerAr: string; answerEn: string }>({
    id: '',
    category: '',
    questionAr: '',
    questionEn: '',
    answerAr: '',
    answerEn: ''
  });

  ngOnInit(): void {
    this.loadFaqs();
    this.loadTickets();
    this.activeTab.set(this.isAdmin() ? 'tickets' : 'faqs');
  }

  /** Normalize ticket status when API returns string names (e.g. "Open") or numeric */
  private parseTicketStatus(value: any): TicketStatus {
    if (value === null || value === undefined) return TicketStatus.Closed;
    if (typeof value === 'number') return value as TicketStatus;
    if (typeof value === 'string') {
      // Try direct enum lookup (TicketStatus['Open'] === 0)
      const key = value as keyof typeof TicketStatus;
      if (key in TicketStatus) {
        // enum lookup returns number | string pair; ensure number return
        const v = (TicketStatus as any)[key];
        if (typeof v === 'number') return v as TicketStatus;
      }
      // fallback common strings
      switch (value.toLowerCase()) {
        case 'open': return TicketStatus.Open;
        case 'inprogress':
        case 'in_progress':
        case 'in progress': return TicketStatus.InProgress;
        case 'resolved': return TicketStatus.Resolved;
        case 'closed': return TicketStatus.Closed;
      }
    }
    return TicketStatus.Closed;
  }

  loadFaqs(): void {
    this.isLoading.set(true);
    this.supportService.getFaqs().subscribe({
      next: faqs => {
        this.faqs.set(faqs ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadTickets(): void {
    this.isLoading.set(true);
    this.supportService.getTicketList(1, 50).subscribe({
      next: res => {
        // normalize status values for each list item
        const items = (res.items ?? []).map((it: any) => ({ ...it, status: this.parseTicketStatus(it.status) }));
        this.ticketsList.set(items);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  createTicket(): void {
    const payload = this.newTicket();
    if (!payload.title.trim() || !payload.initialMessage.trim()) {
      return;
    }

    this.isSubmitting.set(true);
    this.supportService.createTicket(payload).subscribe({
      next: () => {
        this.newTicket.set({ title: '', category: TicketType.Inquiry, initialMessage: '' });
        this.activeTab.set('tickets');
        this.loadTickets();
        this.supportService.loadUnreadCount().subscribe();
        this.isSubmitting.set(false);
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  selectTicket(ticketId: string): void {
    this.supportService.getTicket(ticketId).subscribe({
      next: (ticket: any) => {
        // normalize status on detail response
        ticket.status = this.parseTicketStatus(ticket.status);
        this.selectedTicket.set(ticket);
        this.selectedTicketMessages.set(ticket?.messages ?? []);

        // Map sender/receiver names using the list entry (if available)
        const listEntry = this.ticketsList().find(t => t.publicId === ticketId);
        this.selectedTicketSender.set(listEntry?.senderName ?? '');
        this.selectedTicketReceiver.set(listEntry?.receiverName ?? '');

        // Mark as read immediately on selection
        this.supportService.markMessagesRead(ticketId).subscribe({
          next: () => {
            this.loadTickets();
            this.supportService.loadUnreadCount().subscribe();
          }
        });
      }
    });
  }

  sendReply(ticketId: string): void {
    const form = this.replyForm();
    if (!form.messageBody.trim()) {
      return;
    }

    this.isReplying.set(true);
    this.supportService.addTicketMessage(ticketId, form.messageBody, form.attachment ?? undefined).subscribe({
      next: () => {
        this.replyForm.set({ messageBody: '', attachment: null });
        this.loadTickets();
        this.selectTicket(ticketId);
        this.supportService.loadUnreadCount().subscribe();
        this.isReplying.set(false);
      },
      error: () => this.isReplying.set(false)
    });
  }

  editFaq(faq: FaqDto): void {
    this.faqForm.set({
      id: faq.id,
      category: faq.category,
      questionAr: faq.questionAr,
      questionEn: faq.questionEn,
      answerAr: faq.answerAr,
      answerEn: faq.answerEn
    });
    this.activeTab.set('manage');
  }

  saveFaq(): void {
    const form = this.faqForm();
    if (!form.category.trim() || !form.questionAr.trim() || !form.answerAr.trim()) {
      return;
    }

    const payload = {
      category: form.category,
      questionAr: form.questionAr,
      questionEn: form.questionEn,
      answerAr: form.answerAr,
      answerEn: form.answerEn
    };

    if (form.id) {
      this.supportService.updateFaq(form.id, payload).subscribe(() => {
        this.resetFaqForm();
        this.loadFaqs();
      });
    } else {
      this.supportService.createFaq(payload).subscribe(() => {
        this.resetFaqForm();
        this.loadFaqs();
      });
    }
  }

  deleteFaq(id: string): void {
    if (!confirm('هل تريد حذف هذا السؤال؟')) {
      return;
    }
    this.supportService.deleteFaq(id).subscribe(() => this.loadFaqs());
  }

  resetFaqForm(): void {
    this.faqForm.set({ id: '', category: '', questionAr: '', questionEn: '', answerAr: '', answerEn: '' });
  }

  onReplyFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.replyForm.set({ ...this.replyForm(), attachment: input.files[0] });
    }
  }

  getFaqQuestion(faq: FaqDto): string {
    return this.translationService.currentLang() === 'ar' ? faq.questionAr : (faq.questionEn || faq.questionAr);
  }

  getFaqAnswer(faq: FaqDto): string {
    return this.translationService.currentLang() === 'ar' ? faq.answerAr : (faq.answerEn || faq.answerAr);
  }

  getStatusLabel(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.Open:
        return 'مفتوح';
      case TicketStatus.InProgress:
        return 'قيد العمل';
      case TicketStatus.Resolved:
        return 'تم الحل';
      default:
        return 'مغلق';
    }
  }

  getStatusClasses(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.Open:
        return 'bg-amber-50 text-amber-700';
      case TicketStatus.InProgress:
        return 'bg-sky-50 text-sky-700';
      case TicketStatus.Resolved:
        return 'bg-emerald-50 text-emerald-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  getCategoryLabel(type: TicketType): string {
    switch (type) {
      case TicketType.Complaint:
        return 'شكوى';
      case TicketType.Suggestion:
        return 'اقتراح';
      default:
        return 'استفسار';
    }
  }

  /** Returns a display label for the message date (used in date separators) */
  formatMessageDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (msgDay.getTime() === today.getTime()) return 'اليوم';
    if (msgDay.getTime() === yesterday.getTime()) return 'أمس';
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /** True if two consecutive messages are on different days */
  isDifferentDay(a: SupportMessageDto, b: SupportMessageDto): boolean {
    if (!a || !b) return false;
    const da = new Date(a.createdAt);
    const db = new Date(b.createdAt);
    return da.getFullYear() !== db.getFullYear() ||
           da.getMonth()    !== db.getMonth()    ||
           da.getDate()     !== db.getDate();
  }

  /** Index in selectedTicketMessages() where unread messages start (-1 = none) */
  readonly unreadStartIndex = computed(() => {
    const msgs = this.selectedTicketMessages();
    const adminRoles = ['SuperAdmin', 'FinancialAdmin', 'OperationsAdmin', 'QualityAdmin'];
    const amAdmin = this.authService.currentUser()?.roles?.some(r => adminRoles.includes(r)) ?? false;

    // For a client: unread = messages NOT sent by me (i.e. from support team) that are isRead=false
    // For admin: unread = messages sent by client that are isRead=false
    // We find the first unread message index
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i] as any;
      if (m.isRead === false) {
        // Map message sender name using mapped sender/receiver when possible
        const senderName = m.senderUserId === this.selectedTicket()?.userId ? this.selectedTicketSender() : this.selectedTicketReceiver() || m.senderCode;
        // Check it's NOT sent by the current user
        if (senderName !== this.authService.currentUser()?.fullName) {
          return i;
        }
      }
    }
    return -1;
  });

  attachmentUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Uploaded files are served from server root, not /api/v1
    return `${environment.serverUrl}/${path}`;
  }

  changeTicketStatus(ticketId: string, status: TicketStatus): void {
    if (!confirm('هل تريد تغيير حالة التذكرة؟')) return;
    this.supportService.updateTicketStatus(ticketId, status).subscribe({
      next: () => {
        // refresh details and list
        this.selectTicket(ticketId);
        this.loadTickets();
      },
      error: () => alert('فشل تغيير حالة التذكرة')
    });
  }
}
