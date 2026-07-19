import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { UserProfileDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly api = inject(ApiService);

getUsers(pageNumber: number, pageSize: number, searchTerm?: string, role?: string): Observable<any> {
  let params: any = { pageNumber, pageSize };
  if (searchTerm) params.searchTerm = searchTerm;
  if (role) params.role = role;

  return this.api.get('Users', params); // عدّل الاسم حسب الـ endpoint الفعلي عندك
}

  getDesigners(pageNumber = 1, pageSize = 50, isAvailable = true): Observable<any> {
    return this.api.get<any>('Users/designers', { pageNumber, pageSize, isAvailable });
  }

  toggleActive(userId: string): Observable<{ message: string; isActive: boolean }> {
    return this.api.put<{ message: string; isActive: boolean }>(`Users/${userId}/toggle-active`);
  }

  getAuditLogs(pageNumber = 1, pageSize = 50): Observable<any> {
    return this.api.get<any>('AuditLogs', { pageNumber, pageSize });
  }
}