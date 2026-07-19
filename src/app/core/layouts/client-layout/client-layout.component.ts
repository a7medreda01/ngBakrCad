import { Component, inject, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationNavigationService } from '../../services/notification-navigation.service';
import { SupportService } from '../../services/support.service';

import { EmailVerificationBannerComponent } from '../../../shared/components/email-verification-banner/email-verification-banner.component';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, EmailVerificationBannerComponent],
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.scss'
})
export class ClientLayoutComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly i18n = inject(TranslationService);
  readonly notifService = inject(NotificationService);
  readonly notifNav = inject(NotificationNavigationService);
  readonly supportService = inject(SupportService);
  readonly router = inject(Router);

  readonly isSidebarOpen = signal(false);
  readonly isNotifOpen = signal(false);
  readonly unreadCount = this.notifService.unreadCount;
  readonly unreadSupportCount = this.supportService.unreadTicketsCount;

  /** True when the logged-in user has the Designer role */
  readonly isDesigner = computed(() =>
    this.auth.currentUser()?.roles?.includes('Designer') ?? false
  );

  /** Greeting name */
  readonly displayName = computed(() =>
    this.auth.currentUser()?.fullName ?? ''
  );

  /** Role label shown in sidebar */
  readonly portalLabel = computed(() =>
    this.isDesigner()
      ? (this.i18n.currentLang() === 'ar' ? 'بوابة المعمل / المصمم' : 'Lab Designer Portal')
      : (this.i18n.currentLang() === 'ar' ? 'بوابة الطبيب / العميل' : 'Doctor / Client Portal')
  );

  // --- Sound alert for new notifications ---
  private audioCtx: AudioContext | null = null;
  private pollIntervalId?: any;
  private lastKnownUnreadCount = 0;
  private hasLoadedOnce = false;

  constructor() {
    // كل مرة الـ unreadCount يزيد (وبعد أول تحميل)، شغّل الصوت
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
    this.notifService.loadNotifications().subscribe();
    this.supportService.loadUnreadCount().subscribe();
    // بولينج كل 30 ثانية عشان نكتشف إشعارات جديدة وتذاكر جديدة
    this.pollIntervalId = setInterval(() => {
      this.notifService.loadNotifications().subscribe();
      this.supportService.loadUnreadCount().subscribe();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
  }

  toggleSidebar(): void { this.isSidebarOpen.update(v => !v); }
  closeSidebar(): void  { this.isSidebarOpen.set(false); }

  toggleNotif(): void {
    this.isNotifOpen.update(v => !v);
    if (this.isNotifOpen()) {
      this.notifService.loadNotifications().subscribe();
    }
  }

  /**
   * بيتنفذ عند الضغط على إشعار:
   * 1. يعلّمه كمقروء لو لسه مش مقروء.
   * 2. يقفل القائمة.
   * 3. ينقل للطلب المرتبط لو موجود ربط (relatedEntityId).
   *    ⚠️ الحقل ده لسه مش راجع من الـ Backend، هيتفعل تلقائيًا لما يتضاف هناك.
   */
  openNotification(notif: any): void {
    if (!notif.isRead) {
      this.notifService.markAsRead(notif.id).subscribe();
    }
    this.isNotifOpen.set(false);

    this.notifNav.navigate(notif);
  }

  logout(): void {
    this.auth.logout();
  }

  /** توليد نغمة تنبيه قصيرة برمجيًا بدون ملف صوت خارجي */
  private playNotificationSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // بعض المتصفحات بتوقف الـ AudioContext لحد ما يحصل تفاعل من المستخدم
      if (this.audioCtx.state === 'suspended') {
        // محاولة استئناف الـ context عند أول تفاعل من المستخدم
        this.audioCtx.resume().catch(() => {
          // إذا فشل الاستئناف، نتجاهل الخطأ بصمت
        });
        return; // لا نلعب الصوت إذا كان معلق
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // نغمتين قصار متتاليين (Ding-Dong خفيف)
      this.playTone(ctx, 880, now, 0.12, 0.15);
      this.playTone(ctx, 660, now + 0.14, 0.12, 0.12);
    } catch (error) {
      // لو المتصفح مايدعمش Web Audio API أو حصلت أي خطأ، نتجاهل بصمت
      // (الإشعار نفسه لسه شغال على شاشة التطبيق)
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
      // تجاهل الأخطاء الصوتية بصمت
    }
  }

  /** Translate helper shorthand */
  t(key: string): string { return this.i18n.translate(key); }
}