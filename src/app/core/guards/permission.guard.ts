import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const permissionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  const requiredPermission: string | undefined = route.data['requiredPermission'];
  const expectedRoles: string[] | undefined = route.data['expectedRoles'];

  // Check superadmin override
  if (authService.isSuperAdmin()) {
    return true;
  }

  // Check roles first if specified
  if (expectedRoles && expectedRoles.length > 0) {
    if (!authService.hasRole(expectedRoles)) {
      toastService.show('عذراً، هذه الصفحة غير مصرح لك بالوصول إليها.', 'error');
      router.navigate(['/admin/dashboard']);
      return false;
    }
  }

  // Check specific permission if specified
  if (requiredPermission) {
    if (!authService.hasPermission(requiredPermission)) {
      toastService.show('عذراً، لا تملك الصلاحية المطلوبة لعرض هذه الصفحة.', 'error');
      router.navigate(['/admin/dashboard']);
      return false;
    }
  }

  return true;
};
