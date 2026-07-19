import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse) {
        let errorMsg = 'عذراً، حدث خطأ في الاتصال بالخادم.'; // Default Arabic error
        
        if (error.error && error.error.message) {
          errorMsg = error.error.message;
        } else if (error.error && typeof error.error === 'string') {
          try {
            const parsed = JSON.parse(error.error);
            errorMsg = parsed.message || parsed.error || error.error;
          } catch {
            errorMsg = error.error;
          }
        } else if (error.message) {
          errorMsg = error.message;
        }

        // Do not toast for 401 Unauthorized (silent refreshes handle this) or silent endpoints
        if (error.status !== 401 && !req.url.includes('/api/v1/Notifications')) {
          toastService.error(errorMsg);
        }
      }
      return throwError(() => error);
    })
  );
};
