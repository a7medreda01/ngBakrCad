import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';

export const guestGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  // اسمح للمستخدم المسجل دخول بالوصول لصفحة تأكيد البريد
  // (حالة مستخدم مسجل دخول لكن بريده لسه مش مؤكد)
  if (state.url.startsWith('/auth/verify-email')) {
    return true;
  }

  if (tokenService.getToken() && !tokenService.isTokenExpired()) {
    // Already logged in, redirect to appropriate dashboard
    const roles = tokenService.getUserRoles();
    if (roles.some(r => ['SuperAdmin', 'FinancialAdmin', 'OperationsAdmin', 'QualityAdmin'].includes(r))) {
      router.navigate(['/admin/dashboard']);
    } else if (roles.includes('Designer')) {
      router.navigate(['/lab/dashboard']);
    } else {
      router.navigate(['/client/dashboard']);
    }
    return false;
  }

  return true;
};