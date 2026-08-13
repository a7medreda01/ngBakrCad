import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationDto } from '../../../core/services/notification.service';
import { NotificationNavigationService } from '../../../core/services/notification-navigation.service';
import { TranslationService } from '../../../core/services/translation.service';

interface ToastItem {
  notification: NotificationDto;
  progress: number; // 100 to 0
  isPaused: boolean;
  intervalId?: any;
}

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-6 z-[9999] flex flex-col gap-3 sm:max-w-md sm:w-full pointer-events-none select-none">      @for (item of activeItems(); track item.notification.id) {
        <div
          (mouseenter)="pauseTimer(item)"
          (mouseleave)="resumeTimer(item)"
          (touchstart)="pauseTimer(item)"
          (touchend)="resumeTimer(item)"
          (click)="onNotificationClick(item.notification)"
          class="pointer-events-auto group relative overflow-hidden rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/50 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.18)] transition-all duration-300 animate-ios-banner-in cursor-pointer active:scale-[0.98]"
        >
          <!-- Progress Bar at Top or Bottom -->
          <div class="h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-100 ease-linear"
              [style.width.%]="item.progress"
            ></div>
          </div>

          <div class="p-4 sm:p-4.5 flex flex-col gap-2.5">
            <!-- iOS Banner Header -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <!-- App Icon Badge -->
                <div class="w-6 h-6 rounded-lg brand-gradient flex items-center justify-center text-white shadow-sm ring-1 ring-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <span class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">BakrCad</span>
                <span class="text-[10px] text-slate-400 font-medium">•</span>
                <span class="text-[11px] font-semibold text-slate-400 dark:text-slate-400">
                  {{ getTimeAgo(item.notification.createdAt) }}
                </span>
              </div>

              <!-- Close Button -->
              <button
                type="button"
                (click)="onDismiss($event, item.notification.id)"
                class="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition duration-200"
                title="إغلاق / Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content Area -->
            <div class="flex items-start gap-3">
              <!-- Type Icon -->
              <div [class]="getTypeBadgeClass(item.notification.targetType || item.notification.notificationType)" class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border mt-0.5">
                <ng-container [ngSwitch]="item.notification.targetType || item.notification.notificationType">
                  <!-- Order Icon -->
                  <svg *ngSwitchCase="'Order'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <!-- Meeting Icon -->
                  <svg *ngSwitchCase="'Meeting'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <svg *ngSwitchCase="'MeetingRequest'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <!-- Invoice / Wallet Icon -->
                  <svg *ngSwitchCase="'Invoice'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <!-- Support Icon -->
                  <svg *ngSwitchCase="'Ticket'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <!-- Default Bell Icon -->
                  <svg *ngSwitchDefault xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </ng-container>
              </div>

              <!-- Title & Message Body -->
              <div class="flex-1 flex flex-col gap-0.5 min-w-0">
                <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate leading-snug">
                  {{ isRtl() ? item.notification.titleAr : item.notification.titleEn }}
                </h4>
                <p class="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                  {{ isRtl() ? item.notification.bodyAr : item.notification.bodyEn }}
                </p>
              </div>
            </div>

            <!-- Action Prompt Footer -->
            <div class="flex items-center justify-between text-[11px] font-bold text-primary dark:text-accent pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span class="flex items-center gap-1">
                {{ isRtl() ? 'انقر للفتح والتفاصيل' : 'Tap to open details' }}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 transition-transform group-hover:translate-x-[-3px] rtl:group-hover:translate-x-[3px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes ios-banner-in {
      0% {
        opacity: 0;
        transform: translateY(-24px) scale(0.95);
      }
      70% {
        opacity: 1;
        transform: translateY(4px) scale(1.01);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .animate-ios-banner-in {
      animation: ios-banner-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  readonly notificationService = inject(NotificationService);
  readonly navigationService = inject(NotificationNavigationService);
  readonly translationService = inject(TranslationService);

  readonly activeItems = signal<ToastItem[]>([]);

  ngOnInit(): void {
    // Sync active toasts from service
    setInterval(() => {
      this.syncActiveToasts();
    }, 100);
  }

  ngOnDestroy(): void {
    for (const item of this.activeItems()) {
      if (item.intervalId) clearInterval(item.intervalId);
    }
  }

  isRtl(): boolean {
    return this.translationService.currentLang() === 'ar';
  }

  private syncActiveToasts(): void {
    const rawList = this.notificationService.activeToastNotifications();
    const currentItems = this.activeItems();
    const currentIds = new Set(currentItems.map(i => i.notification.id));
    const newRawIds = new Set(rawList.map(r => r.id));

    // Remove items no longer in raw list
    const updated = currentItems.filter(item => {
      if (!newRawIds.has(item.notification.id)) {
        if (item.intervalId) clearInterval(item.intervalId);
        return false;
      }
      return true;
    });

    // Add new items from raw list
    for (const n of rawList) {
      if (!currentIds.has(n.id)) {
        const newItem: ToastItem = {
          notification: n,
          progress: 100,
          isPaused: false
        };
        this.start5SecTimer(newItem);
        updated.push(newItem);
      }
    }

    if (updated.length !== currentItems.length || updated.some((u, idx) => u !== currentItems[idx])) {
      this.activeItems.set(updated);
    }
  }

  private start5SecTimer(item: ToastItem): void {
    const stepMs = 50;
    const totalMs = 5000;
    const decrement = (stepMs / totalMs) * 100;

    item.intervalId = setInterval(() => {
      if (item.isPaused) return;

      item.progress -= decrement;
      if (item.progress <= 0) {
        clearInterval(item.intervalId);
        this.notificationService.dismissToast(item.notification.id);
      }
    }, stepMs);
  }

  pauseTimer(item: ToastItem): void {
    item.isPaused = true;
  }

  resumeTimer(item: ToastItem): void {
    item.isPaused = false;
  }

  onDismiss(event: Event, id: string): void {
    event.stopPropagation();
    this.notificationService.dismissToast(id);
  }

  onNotificationClick(notification: NotificationDto): void {
    this.notificationService.markAsRead(notification.id).subscribe();
    this.navigationService.navigate(notification);
  }

  getTypeBadgeClass(type?: string | null): string {
    switch (type) {
      case 'Order':
      case 'Case':
        return 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800';
      case 'Meeting':
      case 'MeetingRequest':
        return 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'Invoice':
      case 'Booking':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'Ticket':
      case 'SupportRequest':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-primary-50 dark:bg-primary-950/50 text-primary dark:text-accent border-primary-200 dark:border-primary-800';
    }
  }

  getTimeAgo(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      const isAr = this.isRtl();

      if (diffSec < 60) return isAr ? 'الآن' : 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return isAr ? `منذ ${diffMin} د` : `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return isAr ? `منذ ${diffHr} س` : `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      return isAr ? `منذ ${diffDays} ي` : `${diffDays}d ago`;
    } catch {
      return this.isRtl() ? 'الآن' : 'Just now';
    }
  }
}
