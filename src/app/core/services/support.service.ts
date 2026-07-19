import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable, switchMap } from 'rxjs';
import { CreateTicketRequest, SupportTicketDto, SupportMessageDto, FaqDto, PagedResultDto, SupportTicketListDto, UnreadCountDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SupportService {
  private readonly api = inject(ApiService);

  readonly unreadTicketsCount = signal(0);

  loadUnreadCount(): Observable<UnreadCountDto> {
    return this.api.get<UnreadCountDto>('Support/unread-count').pipe(
      switchMap(res => {
        this.unreadTicketsCount.set(res?.totalUnread ?? 0);
        return [res];
      })
    );
  }

  listFAQs(query = ''): Observable<FaqDto[]> {
    return this.api.get<FaqDto[]>('Support/faqs', { query });
  }

  createTicket(request: CreateTicketRequest): Observable<SupportTicketDto> {
    return this.api.post<SupportTicketDto>('Support/tickets', request);
  }

  getTicket(ticketId: string): Observable<SupportTicketDto> {
    return this.api.get<SupportTicketDto>(`Support/tickets/${ticketId}`);
  }

  getTickets(pageNumber = 1, pageSize = 20): Observable<any> {
    return this.api.get<any>('Support/tickets', { pageNumber, pageSize });
  }

  getTicketList(pageNumber = 1, pageSize = 20): Observable<PagedResultDto<SupportTicketListDto>> {
    return this.api.get<PagedResultDto<SupportTicketListDto>>('Support/tickets/list', { pageNumber, pageSize });
  }

  getUnreadCount(): Observable<UnreadCountDto> {
    return this.api.get<UnreadCountDto>('Support/unread-count');
  }

  addTicketMessage(ticketId: string, messageBody: string, attachment?: File): Observable<SupportMessageDto> {
    const formData = new FormData();
    formData.append('MessageBody', messageBody);
    if (attachment) {
      formData.append('attachment', attachment);
    }
    return this.api.postMultipart<SupportMessageDto>(`Support/tickets/${ticketId}/messages`, formData);
  }

  markMessagesRead(ticketId: string): Observable<any> {
    return this.api.patch(`Support/tickets/${ticketId}/messages/read`, {});
  }

  // --- FAQs CRUD ---
  getFaqs(): Observable<FaqDto[]> {
    return this.api.get<FaqDto[]>('Faqs');
  }

  getFaq(id: string): Observable<FaqDto> {
    return this.api.get<FaqDto>(`Faqs/${id}`);
  }

  createFaq(request: any): Observable<FaqDto> {
    return this.api.post<FaqDto>('Faqs', request);
  }

  updateFaq(id: string, request: any): Observable<FaqDto> {
    return this.api.put<FaqDto>(`Faqs/${id}`, request);
  }

  deleteFaq(id: string): Observable<any> {
    return this.api.delete(`Faqs/${id}`);
  }
}
