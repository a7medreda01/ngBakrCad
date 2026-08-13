import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { TranslationService } from '../services/translation.service';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const translationService = inject(TranslationService);
  const skipToast = req.headers.has('X-Skip-Error-Toast');

  let modifiedReq = req;
  if (skipToast) {
    modifiedReq = req.clone({
      headers: req.headers.delete('X-Skip-Error-Toast')
    });
  }

  return next(modifiedReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse) {
        let errorMsg = 'عذراً، حدث خطأ في الاتصال بالخادم.'; // Default Arabic error
        const currentLang = translationService.currentLang();
        
        if (error.status === 403) {
          errorMsg = error.error?.message || 'عذراً، لا تملك الصلاحيات الكافية للوصول إلى هذه البيانات أو للقيام بهذه العملية.';
        } else if (error.error) {
          const apiError = error.error;
          if (apiError.messageAr || apiError.messageEn) {
            errorMsg = currentLang === 'ar' 
              ? (apiError.messageAr || apiError.message)
              : (apiError.messageEn || apiError.message);
          } else if (apiError.message) {
            errorMsg = apiError.message;
          } else if (typeof apiError === 'string') {
            try {
              const parsed = JSON.parse(apiError);
              errorMsg = parsed.message || parsed.error || apiError;
            } catch {
              errorMsg = apiError;
            }
          }
        } else if (error.message) {
          errorMsg = error.message;
        }

        // Parse any residual '|'
        if (errorMsg.includes('|')) {
          const parts = errorMsg.split('|');
          errorMsg = currentLang === 'ar' ? (parts[1] || parts[0]) : parts[0];
        }

        // Do not toast for 401 Unauthorized (silent refreshes handle this), silent endpoints, or when bypassed
        if (error.status !== 401 && !req.url.includes('/api/v1/Notifications') && !skipToast) {
          toastService.error(errorMsg);
        }
      }
      return throwError(() => error);
    })
  );
};
