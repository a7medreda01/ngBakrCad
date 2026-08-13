import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const designerApprovalGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isDesigner = authService.getCurrentUserRoles().includes('Designer');
  if (!isDesigner) {
    return true;
  }

  const isApproved = (profile: any): boolean => {
    const approvalStatus = profile?.designerProfile?.approvalStatus;
    return approvalStatus === 'Approved' || profile?.designerProfile?.isApproved === true;
  };

  const currentProfile = authService.userProfile();
  if (currentProfile) {
    if (isApproved(currentProfile)) {
      return true;
    }

    router.navigate(['/designer/application-status']);
    return false;
  }

  return authService.loadUserProfile().pipe(
    map(profile => {
      if (isApproved(profile)) {
        return true;
      }

      router.navigate(['/designer/application-status']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/designer/application-status']);
      return of(false);
    })
  );
};
