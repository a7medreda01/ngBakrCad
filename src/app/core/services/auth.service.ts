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
          isEmailVerified: decoded.isEmailVerified === 'true' || decoded.isEmailVerified === true,
          isPhoneVerified: decoded.isPhoneVerified === 'true' || decoded.isPhoneVerified === true
        });
        this.loadUserProfile().subscribe();
      }
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('Auth/login', request, { headers: { 'X-Skip-Error-Toast': 'true' } }).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('Auth/register', request, { headers: { 'X-Skip-Error-Toast': 'true' } }).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<any> {
    return this.api.post('Auth/forgot-password', request, { headers: { 'X-Skip-Error-Toast': 'true' } });
  }

  resetPassword(request: ResetPasswordRequest): Observable<any> {
    return this.api.post('Auth/reset-password', request, { headers: { 'X-Skip-Error-Toast': 'true' } });
  }

  changePassword(request: any): Observable<any> {
    return this.api.post('Auth/change-password', request, { headers: { 'X-Skip-Error-Toast': 'true' } });
  }

  addEmployee(request: AddEmployeeRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('Auth/add-employee', request, { headers: { 'X-Skip-Error-Toast': 'true' } });
  }

  sendVerificationEmail(email: string): Observable<any> {
    return this.api.post('Auth/send-verification-email', { email }, { headers: { 'X-Skip-Error-Toast': 'true' } });
  }

  verifyEmail(email: string, code: string): Observable<any> {
    return this.api.post<any>('Auth/verify-email', { email, code }, { headers: { 'X-Skip-Error-Toast': 'true' } }).pipe(
      tap((res) => {
        // Store the fresh JWT (with isEmailVerified=true) immediately so auth guard passes
        if (res?.token) {
          this.tokenService.saveToken(res.token);
        }
        if (res?.refreshToken) {
          this.tokenService.saveRefreshToken(res.refreshToken);
        }
        // Update the in-memory signal so UI reflects verified state
        const user = this.currentUser();
        if (user) this.currentUser.set({ ...user, isEmailVerified: true });
      })
    );
  }

  sendPhoneVerification(): Observable<any> {
    return this.api.post('Auth/send-phone-verification', {}, { headers: { 'X-Skip-Error-Toast': 'true' } });
  }

  verifyPhone(code: string): Observable<any> {
    return this.api.post('Auth/verify-phone', { code }, { headers: { 'X-Skip-Error-Toast': 'true' } }).pipe(
      tap(() => {
        const user = this.currentUser();
        if (user) this.currentUser.set({ ...user, isPhoneVerified: true });
        // Reload profile so wallet/credit reflects the granted bonus
        this.loadUserProfile().subscribe();
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

  uploadProfilePicture(file: File): Observable<UserProfileDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<UserProfileDto>('Users/profile/picture', formData).pipe(
      tap(profile => this.userProfile.set(profile))
    );
  }

  handleAuthSuccess(res: AuthResponse): void {
    this.tokenService.saveToken(res.token);
    this.tokenService.saveRefreshToken(res.refreshToken);
    // Decode isPhoneVerified from JWT if present
    const decoded = this.tokenService.getDecodedToken();
    this.currentUser.set({
      ...res,
      isPhoneVerified: decoded?.isPhoneVerified === 'true' || decoded?.isPhoneVerified === true
    });
    this.loadUserProfile().subscribe();
  }

  getCurrentUserRoles(): string[] {
    const currentRoles = this.currentUser()?.roles;
    if (currentRoles && currentRoles.length > 0) {
      return currentRoles;
    }

    return this.tokenService.getUserRoles();
  }

  hasRole(expectedRoles: string | string[]): boolean {
    const roles = this.getCurrentUserRoles();
    const expected = Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles];
    return roles.some(r => expected.includes(r));
  }

  hasPermission(permission: string): boolean {
    const roles = this.currentUser()?.roles || this.tokenService.getUserRoles();
    if (roles.includes('SuperAdmin')) return true; // SuperAdmin has full access

    const permissions = this.currentUser()?.permissions || this.tokenService.getUserPermissions();
    return permissions.includes('All') || permissions.includes(permission);
  }

  isSuperAdmin(): boolean {
    return this.hasRole('SuperAdmin');
  }

  private clearSession(): void {
    this.tokenService.clearAll();
    this.currentUser.set(null);
    this.userProfile.set(null);
    this.router.navigate(['/auth/login']);
  }
}
