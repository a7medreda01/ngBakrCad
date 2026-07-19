import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { OrderCreateRequest, OrderDto, OrderReviewRequest, RedoRequest, FileMetadataDto, OrderStatusHistoryDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly api = inject(ApiService);

  createOrder(request: OrderCreateRequest): Observable<OrderDto> {
    return this.api.post<OrderDto>('Orders', request);
  }

  getOrders(pageNumber = 1, pageSize = 10, status?: string, sortBy?: string): Observable<any> {
    const params: Record<string, any> = { pageNumber, pageSize };
    if (status) params['status'] = status;
    if (sortBy) params['sortBy'] = sortBy;
    return this.api.get<any>('Orders', params);
  }

  getMyOrders(pageNumber = 1, pageSize = 10, status?: string, sortBy?: string): Observable<any> {
    const params: Record<string, any> = { pageNumber, pageSize };
    if (status) params['status'] = status;
    if (sortBy) params['sortBy'] = sortBy;
    return this.api.get<any>('Orders/my-orders', params);
  }

  getOrder(id: string): Observable<OrderDto> {
    return this.api.get<OrderDto>(`Orders/${id}`);
  }

  updateStatus(id: string, request: OrderReviewRequest): Observable<OrderDto> {
    return this.api.put<OrderDto>(`Orders/${id}/status`, request);
  }

  assignDesigner(id: string, designerId: string): Observable<OrderDto> {
    return this.api.put<OrderDto>(`Orders/${id}/assign/${designerId}`);
  }

  reopenForRedo(id: string, request: RedoRequest): Observable<OrderDto> {
    return this.api.post<OrderDto>(`Orders/${id}/redo`, request);
  }

  uploadFile(id: string, file: File, category: 'input' | 'cbct' | 'final' | 'client_response' | 'screenshot' = 'input'): Observable<FileMetadataDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postMultipart<FileMetadataDto>(`Orders/${id}/files?category=${category}`, formData);
  }

  uploadFileWithProgress(id: string, file: File, category: 'input' | 'cbct' = 'input'): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postMultipartWithProgress(`Orders/${id}/files?category=${category}`, formData);
  }

  getFileDownloadUrl(fileId: string): Observable<{ url: string }> {
    return this.api.get<{ url: string }>(`Orders/files/${fileId}/download-url`);
  }
  getOrderStatusHistory(id: string): Observable<OrderStatusHistoryDto[]> {
    return this.api.get<OrderStatusHistoryDto[]>(`Orders/${id}/history`);
  }

  setQuotationPrice(orderId: string, price: number): Observable<OrderDto> {
    return this.api.post<OrderDto>(`Orders/${orderId}/quotation-price`, { price });
  }

  approveQuotation(orderId: string): Observable<OrderDto> {
    return this.api.post<OrderDto>(`Orders/${orderId}/approve-quotation`, {});
  }
}
