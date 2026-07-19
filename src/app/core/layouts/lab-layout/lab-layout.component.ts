import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NotificationService } from '../../services/notification.service';
import { DesignerService } from '../../services/designer.service';
import { SupportService } from '../../services/support.service';

import { EmailVerificationBannerComponent } from '../../../shared/components/email-verification-banner/email-verification-banner.component';

@Component({
  selector: 'app-lab-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, EmailVerificationBannerComponent],
  templateUrl: './lab-layout.component.html',
  styleUrl: './lab-layout.component.scss'
})
export class LabLayoutComponent {
  readonly authService = inject(AuthService);
  readonly translationService = inject(TranslationService);
  readonly notificationService = inject(NotificationService);
  readonly supportService = inject(SupportService);
  private readonly designerService = inject(DesignerService);
  private readonly router = inject(Router);

  readonly isSidebarOpen = signal(false);
  readonly isNotificationOpen = signal(false);
  readonly unreadSupportCount = this.supportService.unreadTicketsCount;
  private pollIntervalId?: any;

  ngOnInit(): void {
    this.supportService.loadUnreadCount().subscribe();
    this.pollIntervalId = setInterval(() => {
      this.supportService.loadUnreadCount().subscribe();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
  }

  // Availability status state computed from user profile
  readonly isAvailable = computed(() => this.authService.userProfile()?.designerProfile?.isAvailable ?? true);

  // Computes the anonymized Designer Code e.g. DT-D718
  readonly designerCode = computed(() => {
    const userId = this.authService.currentUser()?.userId;
    if (!userId) return 'DT-XXXX';
    return `DT-${userId.substring(0, 4).toUpperCase()}`;
  });

  toggleSidebar(): void {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  toggleNotifications(): void {
    this.isNotificationOpen.set(!this.isNotificationOpen());
    if (this.isNotificationOpen()) {
      this.notificationService.loadNotifications().subscribe();
    }
  }

  toggleAvailability(): void {
    const nextVal = !this.isAvailable();
    this.designerService.updateAvailability(nextVal).subscribe({
      next: () => {
        const profile = this.authService.userProfile();
        if (profile) {
          if (!profile.designerProfile) {
            profile.designerProfile = {
              userId: profile.id,
              specialization: null,
              slaStats: null,
              rating: 5,
              level: 1
            };
          }
          profile.designerProfile.isAvailable = nextVal;
          this.authService.userProfile.set({ ...profile });
        }
      }
    });
  }

  markNotificationAsRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe();
  }

  /**
   * بيتنفذ عند الضغط على أي إشعار:
   * 1. يعلّمه كمقروء (لو لسه مش مقروء).
   * 2. يقفل قائمة الإشعارات.
   * 3. ينقل المستخدم لتفاصيل الطلب المرتبط بالإشعار (لو موجود orderId).
   */
  openNotification(n: any): void {
    if (!n.isRead) {
      this.notificationService.markAsRead(n.id).subscribe();
    }
    this.isNotificationOpen.set(false);

    const orderId = n.orderId || n.referenceId;
    if (orderId) {
      this.router.navigate(['/lab/cases', orderId]);
    }
  }

  /** يمنع فتح الطلب لما المستخدم يضغط تحديدًا على زرار "تمت القراءة" */
  onMarkReadClick(event: Event, id: string): void {
    event.stopPropagation();
    this.markNotificationAsRead(id);
  }

  logout(): void {
    this.authService.logout();
  }
}