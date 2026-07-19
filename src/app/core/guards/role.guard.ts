import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  const expectedRoles: string[] = route.data['expectedRoles'] || [];
  const userRoles = tokenService.getUserRoles();

  const hasRole = userRoles.some(role => expectedRoles.includes(role));
  if (hasRole) {
    return true;
  }

  // Unauthorized. Redirect user to their matching home portal
  const isAdmin = userRoles.some(r => ['SuperAdmin', 'FinancialAdmin', 'OperationsAdmin', 'QualityAdmin'].includes(r));
  const isDesigner = userRoles.includes('Designer');
  const isClient = userRoles.some(r => ['Doctor', 'Lab'].includes(r));

  if (isAdmin) {
    router.navigate(['/admin']);
  } else if (isDesigner) {
    router.navigate(['/lab']);
  } else if (isClient) {
    router.navigate(['/client']);
  } else {
    router.navigate(['/auth/login']);
  }

  return false;
};
