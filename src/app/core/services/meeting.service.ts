import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { ScheduleMeetingRequest, MeetingRequestDto, MeetingDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MeetingService {
  private readonly api = inject(ApiService);

  requestMeeting(request: ScheduleMeetingRequest): Observable<MeetingRequestDto> {
    return this.api.post<MeetingRequestDto>('Meetings/request', request);
  }

  getPendingMeetings(): Observable<MeetingRequestDto[]> {
    return this.api.get<MeetingRequestDto[]>('Meetings/pending');
  }

  approveMeeting(requestId: string): Observable<MeetingDto> {
    return this.api.post<MeetingDto>(`Meetings/${requestId}/approve`);
  }

  getMeetings(): Observable<MeetingRequestDto[]> {
    return this.api.get<MeetingRequestDto[]>('Meetings');
  }
}
