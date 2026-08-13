import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.getToken() && !tokenService.isTokenExpired()) {
    const roles = tokenService.getUserRoles();
    const isDoctorOrDesigner = roles.some(r => ['Doctor', 'Designer', 'Lab'].includes(r));
    const decoded = tokenService.getDecodedToken();
    const isVerified = decoded?.isEmailVerified === 'true' || decoded?.isEmailVerified === true;

    if (isDoctorOrDesigner && !isVerified && !state.url.startsWith('/auth/verify-email')) {
      const email = decoded?.email || '';
      router.navigate(['/auth/verify-email'], { queryParams: { email } });
      return false;
    }
    return true;
  }

  // Not logged in, redirect to login page with return url
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
