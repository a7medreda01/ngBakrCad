import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { ApiService } from '../api/api.service';
import { TokenService } from './token.service';
import { Observable, Subscription, interval, startWith, switchMap, tap } from 'rxjs';

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

const SHOWN_TOASTS_KEY = 'bakrcad_shown_notification_ids';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly api = inject(ApiService);
  private readonly tokenService = inject(TokenService);

  readonly notifications = signal<NotificationDto[]>([]);
  readonly activeToastNotifications = signal<NotificationDto[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  
  private pollingSub?: Subscription;
  private shownIds = new Set<string>();

  constructor() {
    this.loadShownIds();

    // Start polling if authenticated
    effect(() => {
      const token = this.tokenService.getToken();
      if (token && !this.tokenService.isTokenExpired()) {
        this.startPolling();
        this.setupVisibilityListener();
      } else {
        this.stopPolling();
      }
    });
  }

  private loadShownIds(): void {
    try {
      const stored = sessionStorage.getItem(SHOWN_TOASTS_KEY);
      if (stored) {
        const arr: string[] = JSON.parse(stored);
        this.shownIds = new Set(arr);
      }
    } catch {
      this.shownIds = new Set();
    }
  }

  private saveShownIds(): void {
    try {
      sessionStorage.setItem(SHOWN_TOASTS_KEY, JSON.stringify(Array.from(this.shownIds)));
    } catch {}
  }

  loadNotifications(): Observable<NotificationDto[]> {
    return this.api.get<NotificationDto[]>('Notifications').pipe(
      tap((data: NotificationDto[]) => {
        const list = data || [];
        this.notifications.set(list);
        this.checkAndTriggerToasts(list);
      })
    );
  }

  private checkAndTriggerToasts(list: NotificationDto[]): void {
    const unreadList = list.filter(n => !n.isRead);
    const newToasts: NotificationDto[] = [];

    for (const n of unreadList) {
      if (!this.shownIds.has(n.id)) {
        this.shownIds.add(n.id);
        newToasts.push(n);
      }
    }

    if (newToasts.length > 0) {
      this.saveShownIds();
      // Stack newly discovered unread toasts (max 3 at once)
      this.activeToastNotifications.update(active => {
        const existingIds = new Set(active.map(a => a.id));
        const toAdd = newToasts.filter(t => !existingIds.has(t.id));
        return [...toAdd, ...active].slice(0, 3);
      });

      this.playNotificationSound();
    }
  }

  dismissToast(id: string): void {
    this.activeToastNotifications.update(list => list.filter(n => n.id !== id));
  }

  markAsRead(id: string): Observable<any> {
    this.dismissToast(id);
    return this.api.put(`Notifications/${id}/read`).pipe(
      switchMap(res => {
        this.notifications.update(list => list.map(n => n.id === id ? { ...n, isRead: true } : n));
        return [res];
      })
    );
  }

  playNotificationSound(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // iOS style pleasant double-chime note (E6 -> A6)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.51, now); // E6
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.08); // A6

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.35);
    } catch {
      // Audio playback restrictions safely handled
    }
  }

  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        this.loadNotifications().subscribe({ error: () => {} });
      }
    };

    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    window.removeEventListener('focus', handleVisibilityOrFocus);

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
  }

  startPolling(): void {
    if (this.pollingSub) return;

    // Check notifications every 15 seconds
    this.pollingSub = interval(15000).pipe(
      startWith(0),
      switchMap(() => this.loadNotifications())
    ).subscribe({
      error: () => {
        // Suppress background errors during offline mode
      }
    });
  }

  stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
    this.notifications.set([]);
    this.activeToastNotifications.set([]);
  }
}
