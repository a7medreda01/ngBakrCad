import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NotificationService } from '../../services/notification.service';
import { NotificationNavigationService } from '../../services/notification-navigation.service';
import { SupportService } from '../../services/support.service';
import { OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly translationService = inject(TranslationService);
  readonly notificationService = inject(NotificationService);
  readonly notifNav = inject(NotificationNavigationService);
  readonly supportService = inject(SupportService);

  readonly isSidebarOpen = signal(false);
  readonly isNotifOpen = signal(false);
  readonly unreadCount = this.notificationService.unreadCount;
  readonly unreadSupportCount = this.supportService.unreadTicketsCount;
  private pollIntervalId?: any;

  // --- Sound alert for new notifications ---
  private audioCtx: AudioContext | null = null;
  private lastKnownUnreadCount = 0;
  private hasLoadedOnce = false;

  constructor() {
    // Play sound when unreadCount increases
    effect(() => {
      const current = this.unreadCount();
      if (this.hasLoadedOnce && current > this.lastKnownUnreadCount) {
        this.playNotificationSound();
      }
      this.lastKnownUnreadCount = current;
      if (current >= 0) {
        this.hasLoadedOnce = true;
      }
    });
  }

  ngOnInit(): void {
    this.notificationService.loadNotifications().subscribe();
    this.supportService.loadUnreadCount().subscribe();
    this.pollIntervalId = setInterval(() => {
      this.notificationService.loadNotifications().subscribe();
      this.supportService.loadUnreadCount().subscribe();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  toggleNotif(): void {
    this.isNotifOpen.update(v => !v);
    if (this.isNotifOpen()) {
      this.notificationService.loadNotifications().subscribe();
    }
  }

  openNotification(notif: any): void {
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id).subscribe();
    }
    this.isNotifOpen.set(false);

    this.notifNav.navigate(notif);
  }

  logout(): void {
    this.authService.logout();
  }

  private playNotificationSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
        return;
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      this.playTone(ctx, 880, now, 0.12, 0.15);
      this.playTone(ctx, 660, now + 0.14, 0.12, 0.12);
    } catch (error) {
      // Ignore audio errors silently
    }
  }

  private playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number, volume: number): void {
    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    } catch (error) {
      // Ignore audio errors silently
    }
  }
}
