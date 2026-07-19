import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { TokenService } from './token.service';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginRequest, RegisterRequest, AuthResponse, UserProfileDto, ForgotPasswordRequest, ResetPasswordRequest, AddEmployeeRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  readonly currentUser = signal<AuthResponse | null>(null);
  readonly userProfile = signal<UserProfileDto | null>(null);

  constructor() {
    // Restore session if token exists
    const token = this.tokenService.getToken();
    if (token && !this.tokenService.isTokenExpired()) {
      const decoded = this.tokenService.getDecodedToken();
      if (decoded) {
        this.currentUser.set({
          userId: this.tokenService.getUserId() || '',
          email: decoded.email || '',
          fullName: decoded.unique_name || '',
          token: token,
          refreshToken: this.tokenService.getRefreshToken() || '',
          roles: this.tokenService.getUserRoles(),
          permissions: this.tokenService.getUserPermissions(),
          isEmailVerified: decoded.isEmailVerified === 'true' || decoded.isEmailVerified === true
        });
        this.loadUserProfile().subscribe();
      }
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('Auth/login', request).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('Auth/register', request).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<any> {
    return this.api.post('Auth/forgot-password', request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<any> {
    return this.api.post('Auth/reset-password', request);
  }

  changePassword(request: any): Observable<any> {
    return this.api.post('Auth/change-password', request);
  }

  addEmployee(request: AddEmployeeRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('Auth/add-employee', request);
  }

  sendVerificationEmail(email: string): Observable<any> {
    return this.api.post('Auth/send-verification-email', { email });
  }

  verifyEmail(email: string, code: string): Observable<any> {
    return this.api.post('Auth/verify-email', { email, code }).pipe(
      tap(() => {
        // Update user state to verified
        const user = this.currentUser();
        if (user) {
          this.currentUser.set({
            ...user,
            isEmailVerified: true
          });
        }
      })
    );
  }

  logout(): void {
    const refreshToken = this.tokenService.getRefreshToken();
    if (refreshToken) {
      this.api.post('Auth/revoke-token', { token: refreshToken }).subscribe({
        next: () => this.clearSession(),
        error: () => this.clearSession()
      });
    } else {
      this.clearSession();
    }
  }

  loadUserProfile(): Observable<UserProfileDto> {
    return this.api.get<UserProfileDto>('Users/profile').pipe(
      tap(profile => this.userProfile.set(profile))
    );
  }

  updateProfile(request: any): Observable<UserProfileDto> {
    return this.api.put<UserProfileDto>('Users/profile', request).pipe(
      tap(profile => this.userProfile.set(profile))
    );
  }

  handleAuthSuccess(res: AuthResponse): void {
    this.tokenService.saveToken(res.token);
    this.tokenService.saveRefreshToken(res.refreshToken);
    this.currentUser.set(res);
    this.loadUserProfile().subscribe();
  }

  private clearSession(): void {
    this.tokenService.clearAll();
    this.currentUser.set(null);
    this.userProfile.set(null);
    this.router.navigate(['/auth/login']);
  }
}
