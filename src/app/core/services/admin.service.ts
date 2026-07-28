import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { UserProfileDto, EmployeeDto, RolePermissionsSummaryDto } from '../models';

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

  getEmployees(pageNumber = 1, pageSize = 50, searchTerm?: string, role?: string): Observable<{ items: EmployeeDto[]; totalCount: number; pageNumber: number; pageSize: number }> {
    let params: any = { pageNumber, pageSize };
    if (searchTerm) params.searchTerm = searchTerm;
    if (role) params.role = role;

    return this.api.get<{ items: EmployeeDto[]; totalCount: number; pageNumber: number; pageSize: number }>('Users/employees', params);
  }

  updateEmployeeRole(id: string, role: string): Observable<EmployeeDto> {
    return this.api.put<EmployeeDto>(`Users/employees/${id}/role`, { role });
  }

  updateEmployeePermissions(id: string, permissions: string[]): Observable<EmployeeDto> {
    return this.api.put<EmployeeDto>(`Users/employees/${id}/permissions`, { permissions });
  }

  getEmployeeRolesAndPermissions(): Observable<RolePermissionsSummaryDto[]> {
    return this.api.get<RolePermissionsSummaryDto[]>('Users/employee-roles-permissions');
  }

  getDesigners(pageNumber = 1, pageSize = 50, isAvailable = true): Observable<any> {
    return this.api.get<any>('Users/designers', { pageNumber, pageSize, isAvailable });
  }

  toggleActive(userId: string): Observable<{ message: string; isActive: boolean }> {
    return this.api.put<{ message: string; isActive: boolean }>(`Users/${userId}/toggle-active`);
  }

  adminUpdateProfile(userId: string, request: any): Observable<UserProfileDto> {
    return this.api.put<UserProfileDto>(`Users/${userId}/admin-update-profile`, request);
  }

  getAuditLogs(pageNumber = 1, pageSize = 50): Observable<any> {
    return this.api.get<any>('AuditLogs', { pageNumber, pageSize });
  }
}