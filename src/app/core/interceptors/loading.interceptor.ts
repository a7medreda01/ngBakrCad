import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingService } from '../services/loading.service';
import { finalize } from 'rxjs';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Skip loading overlay for background notifications or chat checking
  const isBackground = req.url.includes('/api/v1/Notifications') || req.url.includes('/api/v1/Support/tickets/');
  
  if (!isBackground) {
    loadingService.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (!isBackground) {
        loadingService.hide();
      }
    })
  );
};
