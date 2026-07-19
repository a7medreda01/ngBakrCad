import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { DesignerDashboardDto, OrderDto, OrderReviewRequest, FileMetadataDto, DesignerBillingDto, UpdateDesignerProfileRequest } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DesignerService {
  private readonly api = inject(ApiService);

  getDashboard(): Observable<DesignerDashboardDto> {
    return this.api.get<DesignerDashboardDto>('Designer/dashboard');
  }

  getOrders(pageNumber = 1, pageSize = 10, status?: string, sortBy?: string): Observable<any> {
    const params: Record<string, any> = { pageNumber, pageSize };
    if (status) params['status'] = status;
    if (sortBy) params['sortBy'] = sortBy;
    return this.api.get<any>('Designer/orders', params);
  }

  getOrderDetail(orderId: string): Observable<OrderDto> {
    return this.api.get<OrderDto>(`Designer/orders/${orderId}`);
  }

  getOrderFiles(orderId: string): Observable<FileMetadataDto[]> {
    return this.api.get<FileMetadataDto[]>(`Designer/orders/${orderId}/files`);
  }

  updateOrderStatus(orderId: string, request: OrderReviewRequest): Observable<OrderDto> {
    return this.api.put<OrderDto>(`Designer/orders/${orderId}/status`, request);
  }

  uploadDesignFile(orderId: string, file: File, category = 'final'): Observable<FileMetadataDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postMultipart<FileMetadataDto>(`Designer/orders/${orderId}/files?category=${category}`, formData);
  }

  /**
   * رفع ملف معاينة أو إضافة رابط خارجي للمعاينة.
   * لازم واحد بس من الاتنين: payload.file أو payload.externalLink.
   */
  uploadPreviewFile(orderId: string, payload: { file?: File; externalLink?: string }): Observable<FileMetadataDto> {
    const formData = new FormData();
    if (payload.file) {
      formData.append('File', payload.file);
    }
    if (payload.externalLink) {
      formData.append('ExternalLink', payload.externalLink);
    }
    return this.api.postMultipart<FileMetadataDto>(`Designer/orders/${orderId}/preview`, formData);
  }

  getEarnings(pageNumber = 1, pageSize = 20, payoutStatus?: string): Observable<any> {
    const params: Record<string, any> = { pageNumber, pageSize };
    if (payoutStatus) params['payoutStatus'] = payoutStatus;
    return this.api.get<any>('Designer/earnings', params);
  }

  getEarningsSummary(): Observable<any> {
    return this.api.get<any>('Designer/earnings/summary');
  }

  getAvailableWithdrawal(): Observable<any> {
    return this.api.get<any>('Designer/withdrawal/available');
  }

  requestWithdrawal(): Observable<any> {
    return this.api.post<any>('Designer/withdrawal/request');
  }

  getProfile(): Observable<any> {
    return this.api.get<any>('Designer/profile');
  }

  updateProfile(request: UpdateDesignerProfileRequest): Observable<any> {
    return this.api.put<any>('Designer/profile', request);
  }

  getOrderSla(orderId: string): Observable<any> {
    return this.api.get<any>(`Designer/orders/${orderId}/sla`);
  }

  getNotifications(): Observable<any[]> {
    return this.api.get<any[]>('Designer/notifications');
  }

  markNotificationRead(notificationId: string): Observable<any> {
    return this.api.put<any>(`Designer/notifications/${notificationId}/read`);
  }

  getFileDownloadUrl(fileId: string): Observable<{url:string}> {
    return this.api.get<{url:string}>(`Designer/orders/files/${fileId}/download-url`);
  }

  updateAvailability(isAvailable: boolean): Observable<any> {
    return this.api.put<any>(`Designer/availability?isAvailable=${isAvailable}`, {});
  }

  acceptOrder(orderId: string): Observable<any> {
    return this.api.post<any>(`Designer/orders/${orderId}/accept`, {});
  }

  rejectOrder(orderId: string, reason: string): Observable<any> {
    return this.api.post<any>(`Designer/orders/${orderId}/reject`, reason);
  }

  getAbsoluteUrl(path: string): string {
    const baseUrl = environment.apiUrl.replace('/api/v1', '');
    return `${baseUrl}/${path}`;
  }
  
}