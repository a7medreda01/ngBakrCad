import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly ACCESS_TOKEN_KEY = 'bkr_access_token';
  private readonly REFRESH_TOKEN_KEY = 'bkr_refresh_token';

  saveToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  clearToken(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
  }

  saveRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  clearRefreshToken(): void {
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  clearAll(): void {
    this.clearToken();
    this.clearRefreshToken();
  }

  getDecodedToken(): any | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodedPayload);
    } catch (e) {
      return null;
    }
  }

  getUserId(): string | null {
    const payload = this.getDecodedToken();
    if (!payload) return null;
    return payload.nameid || payload.sub || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || null;
  }

  getUserRoles(): string[] {
    const payload = this.getDecodedToken();
    if (!payload) return [];
    const roles = payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || [];
    return Array.isArray(roles) ? roles : [roles];
  }

  getUserPermissions(): string[] {
    const payload = this.getDecodedToken();
    if (!payload) return [];
    const permissions = payload.permissions || [];
    return Array.isArray(permissions) ? permissions : [permissions];
  }

  isTokenExpired(): boolean {
    const payload = this.getDecodedToken();
    if (!payload) return true;
    if (!payload.exp) return false;
    const expiryTime = payload.exp * 1000;
    return Date.now() >= expiryTime;
  }
}
