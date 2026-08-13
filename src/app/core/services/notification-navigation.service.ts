import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationDto } from './notification.service';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationNavigationService {
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);

  /**
   * Centralised navigation handler when clicking a notification.
   * Resolves target paths dynamically based on notification's targetType, targetPublicId, and user roles.
   */
  navigate(notification: NotificationDto): void {
    const type = notification.targetType;
    const publicId = notification.targetPublicId;

    if (!type || !publicId) {
      console.warn('Notification is missing target details for routing.');
      return;
    }

    // Determine current user role layout prefix
    const roles = this.tokenService.getUserRoles() || [];
    let portalPrefix = 'client'; // Default client portal

    if (roles.includes('SuperAdmin') || roles.includes('FinancialAdmin') || roles.includes('OperationsAdmin') || roles.includes('QualityAdmin')) {
      portalPrefix = 'admin';
    } else if (roles.includes('Designer')) {
      portalPrefix = 'lab';
    }

    switch (type) {
      case 'Order':
        if (portalPrefix === 'lab') {
          this.router.navigate([`/${portalPrefix}/cases`, publicId]);
        } else {
          this.router.navigate([`/${portalPrefix}/orders`, publicId]);
        }
        break;

      case 'Meeting':
      case 'MeetingRequest':
        this.router.navigate([`/${portalPrefix}/meetings`], { queryParams: { meetingId: publicId } });
        break;

      case 'Case':
        if (portalPrefix === 'admin') {
          this.router.navigate([`/admin/orders`, publicId]);
        } else {
          this.router.navigate([`/lab/cases`, publicId]);
        }
        break;

      case 'Booking':
        this.router.navigate([`/${portalPrefix}/dashboard`]); // Fallback for booking flow
        break;

      case 'Ticket':
      case 'SupportRequest':
        this.router.navigate([`/${portalPrefix}/support`]);
        break;

      case 'Invoice':
        if (portalPrefix === 'client') {
          this.router.navigate([`/client/wallet`]);
        } else if (portalPrefix === 'admin') {
          this.router.navigate([`/admin/wallet`]);
        } else {
          this.router.navigate([`/${portalPrefix}/dashboard`]);
        }
        break;

      case 'DesignerRequest':
      case 'DesignerJoin':
        if (portalPrefix === 'admin') {
          this.router.navigate(['/admin/users'], { queryParams: { tab: 'designerRequests' } });
        } else {
          this.router.navigate(['/designer/application-status']);
        }
        break;

      case 'DesignerApproval':
      case 'DesignerRejection':
        if (portalPrefix === 'lab') {
          this.router.navigate(['/designer/application-status']);
        } else if (portalPrefix === 'admin') {
          this.router.navigate(['/admin/users'], { queryParams: { tab: 'designerRequests' } });
        } else {
          this.router.navigate(['/designer/application-status']);
        }
        break;

      default:
        console.warn(`Unhandled notification target type: ${type}`);
        this.router.navigate([`/${portalPrefix}/dashboard`]);
        break;
    }
  }
}
