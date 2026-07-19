import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { ApiService } from '../api/api.service';
import { TokenService } from './token.service';
import { Observable, Subscription, interval, startWith, switchMap } from 'rxjs';

export interface NotificationDto {
  id: string;
  userId: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  isRead: boolean;
  notificationType: string;
  createdAt: string;
  targetPublicId?: string | null;
  targetType?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly api = inject(ApiService);
  private readonly tokenService = inject(TokenService);

  readonly notifications = signal<NotificationDto[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  
  private pollingSub?: Subscription;

  constructor() {
    // Start polling if authenticated
    effect(() => {
      const token = this.tokenService.getToken();
      if (token && !this.tokenService.isTokenExpired()) {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    });
  }

  loadNotifications(): Observable<NotificationDto[]> {
    return this.api.get<NotificationDto[]>('Notifications').pipe(
      switchMap(data => {
        this.notifications.set(data || []);
        return [data];
      })
    );
  }

  markAsRead(id: string): Observable<any> {
    return this.api.put(`Notifications/${id}/read`).pipe(
      switchMap(res => {
        this.notifications.update(list => list.map(n => n.id === id ? { ...n, isRead: true } : n));
        return [res];
      })
    );
  }

  startPolling(): void {
    if (this.pollingSub) return;

    this.pollingSub = interval(30000).pipe(
      startWith(0),
      switchMap(() => this.loadNotifications())
    ).subscribe({
      error: () => {
        // Suppress background errors during offline/inactive modes
      }
    });
  }

  stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
    this.notifications.set([]);
  }
}
