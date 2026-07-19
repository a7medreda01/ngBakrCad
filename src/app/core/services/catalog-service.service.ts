import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { ServiceDto, CreateServiceRequest, UpdateServiceRequest, SetCustomPriceRequest, SetCustomProfitRequest, DesignerServicePricingDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly api = inject(ApiService);

  getServices(): Observable<ServiceDto[]> {
    return this.api.get<ServiceDto[]>('Services');
  }

  createService(request: CreateServiceRequest): Observable<ServiceDto> {
    return this.api.post<ServiceDto>('Services', request);
  }

  updateService(id: string, request: UpdateServiceRequest): Observable<ServiceDto> {
    return this.api.put<ServiceDto>(`Services/${id}`, request);
  }

  deleteService(id: string): Observable<any> {
    return this.api.delete<any>(`Services/${id}`);
  }

  setCustomPrice(serviceId: string, request: SetCustomPriceRequest): Observable<any> {
    return this.api.post(`Services/${serviceId}/custom-price`, request);
  }

  /** يستخدمها الطبيب نفسه لعرض أسعاره الخاصة (بيعتمد على التوكن) */
  getMyCustomPrices(): Observable<any[]> {
    return this.api.get<any[]>(`Services/my-custom-prices`);
  }

  /** [جديد] يستخدمها الأدمن لعرض الأسعار المخصصة لأي طبيب يختاره */
  getCustomPricesForDoctor(doctorId: string): Observable<any[]> {
    return this.api.get<any[]>(`Services/custom-prices/${doctorId}`);
  }

  /** أرباح مصمم مخصصة — الأدمن فقط */
  setCustomProfit(serviceId: string, request: SetCustomProfitRequest): Observable<any> {
    return this.api.post(`Services/${serviceId}/custom-profit`, request);
  }

  getCustomProfitsForDesigner(designerId: string): Observable<DesignerServicePricingDto[]> {
    return this.api.get<DesignerServicePricingDto[]>(`Services/custom-profits/${designerId}`);
  }
}