import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Variables for managing token refresh state across concurrent requests
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const refreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const http = inject(HttpClient);
  const router = inject(Router);
  const auth = inject(AuthService);
  const apiUrl = environment.apiUrl;

  return next(req).pipe(
    catchError((error) => {
      // Avoid infinite loop if refresh token endpoint fails
      if (req.url.includes('/Auth/refresh-token')) {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        auth.logout();
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse && error.status === 401) {
        const refreshToken = tokenService.getRefreshToken();
        if (!refreshToken) {
          auth.logout();
          return throwError(() => error);
        }

        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          // We pass the raw request without Auth headers to avoid server side conflict
          return http.post<any>(`${apiUrl}/Auth/refresh-token`, { token: refreshToken }).pipe(
            switchMap((res: any) => {
              isRefreshing = false;
              if (res && res.token) {
                // Update local storage
                tokenService.saveToken(res.token);
                if (res.refreshToken) {
                  tokenService.saveRefreshToken(res.refreshToken);
                }

                // Update AuthService currentUser state so components and template reactive logic updates immediately
                const decoded = tokenService.getDecodedToken();
                auth.currentUser.set({
                  userId: tokenService.getUserId() || '',
                  email: decoded?.email || res.email || '',
                  fullName: decoded?.unique_name || res.fullName || '',
                  token: res.token,
                  refreshToken: res.refreshToken || refreshToken,
                  roles: tokenService.getUserRoles(),
                  permissions: tokenService.getUserPermissions(),
                  isEmailVerified: decoded?.isEmailVerified === 'true' || decoded?.isEmailVerified === true
                });

                // Release waiting requests
                refreshTokenSubject.next(res.token);

                // Clone the failed request with the new access token
                const newReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${res.token}`
                  }
                });
                return next(newReq);
              }

              auth.logout();
              return throwError(() => new Error('Refresh failed'));
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              refreshTokenSubject.next(null);
              auth.logout();
              return throwError(() => refreshErr);
            })
          );
        } else {
          // If we are already refreshing, queue this request until refresh completes
          return refreshTokenSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap((newToken) => {
              const newReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(newReq);
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};
