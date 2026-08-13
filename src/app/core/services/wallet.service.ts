import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';
import { WalletTransactionDto, BalanceAdjustmentRequest, CreditLimitUpdateRequest, DepositPackageDto, InvoiceDto, PagedResultDto, WalletDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private readonly api = inject(ApiService);

getTransactions(userId: string): Observable<PagedResultDto<WalletTransactionDto>> {
  return this.api.get<PagedResultDto<WalletTransactionDto>>(`Wallet/${userId}/transactions`);
}

getAllTransactions(pageNumber: number = 1, pageSize: number = 50, kind?: string): Observable<any> {
  let url = `Wallet/admin/all-transactions?pageNumber=${pageNumber}&pageSize=${pageSize}`;
  if (kind) url += `&kind=${kind}`;
  return this.api.get<any>(url);
}

  adjustBalance(userId: string, request: BalanceAdjustmentRequest): Observable<any> {
    return this.api.post(`Wallet/${userId}/adjust`, request);
  }

  adjustManualBalance(userId: string, request: { amount: number; isDebit: boolean; notes: string }): Observable<any> {
    return this.api.post(`Wallet/${userId}/adjust`, request);
  }

  updateCreditLimit(userId: string, request: CreditLimitUpdateRequest): Observable<any> {
    return this.api.put(`Wallet/${userId}/credit-limit`, request);
  }

  /** Client-facing: active packages available for purchase (no admin permission required) */
  getAvailablePackages(): Observable<DepositPackageDto[]> {
    return this.api.get<DepositPackageDto[]>('Wallet/packages');
  }

  purchasePackage(packageId: string): Observable<{ checkoutUrl: string }> {
    return this.api.post<{ checkoutUrl: string }>(`Wallet/packages/${packageId}/purchase`);
  }

  confirmCheckoutSession(sessionId: string): Observable<WalletDto> {
    return this.api.post<WalletDto>('Wallet/stripe/confirm-checkout', { sessionId });
  }

  payInvoiceViaStripe(invoiceId: string): Observable<{ clientSecret: string }> {
    return this.api.post<{ clientSecret: string }>(`Wallet/invoices/${invoiceId}/pay-stripe`);
  }

  getPayoutBalance(): Observable<number> {
    return this.api.get<number>('Wallet/designer/payout-balance');
  }

  requestWithdrawal(): Observable<any> {
    return this.api.post('Wallet/designer/withdraw');
  }

  // --- Deposit Packages CRUD (Admin only) ---
  getPackages(): Observable<DepositPackageDto[]> {
    return this.api.get<DepositPackageDto[]>('DepositPackages');
  }

  getPackage(id: string): Observable<DepositPackageDto> {
    return this.api.get<DepositPackageDto>(`DepositPackages/${id}`);
  }

  createPackage(request: any): Observable<DepositPackageDto> {
    return this.api.post<DepositPackageDto>('DepositPackages', request);
  }

  updatePackage(id: string, request: any): Observable<DepositPackageDto> {
    return this.api.put<DepositPackageDto>(`DepositPackages/${id}`, request);
  }

  deletePackage(id: string): Observable<any> {
    return this.api.delete(`DepositPackages/${id}`);
  }

  // --- Invoices ---
  getInvoices(pageNumber = 1, pageSize = 20): Observable<any> {
    return this.api.get<any>('Invoices', { pageNumber, pageSize });
  }

  getInvoice(id: string): Observable<InvoiceDto> {
    return this.api.get<InvoiceDto>(`Invoices/${id}`);
  }

  // --- System Settings ---
  getSettings(): Observable<any[]> {
    return this.api.get<any[]>('Settings');
  }

  getPublicSetting(key: string): Observable<any> {
    return this.api.get<any>(`Settings/public/${key}`);
  }

  updateSetting(key: string, value: string): Observable<any> {
    return this.api.put(`Settings/${key}`, { value });
  }

  // --- Withdrawal Requests ---
  submitWithdrawal(request: { amount: number; paymentMethod: string; paymentDetails: string }): Observable<any> {
    return this.api.post('Withdrawal/request', request);
  }

  getMyWithdrawals(): Observable<any[]> {
    return this.api.get<any[]>('Withdrawal/my-requests');
  }

  getAllWithdrawals(): Observable<any[]> {
    return this.api.get<any[]>('Withdrawal/all-requests');
  }

  approveWithdrawal(requestId: string, adminNotes?: string): Observable<any> {
    return this.api.post(`Withdrawal/approve/${requestId}`, { adminNotes });
  }

  rejectWithdrawal(requestId: string, adminNotes?: string): Observable<any> {
    return this.api.post(`Withdrawal/reject/${requestId}`, { adminNotes });
  }

  // --- Designer Pending Earnings ---
  getPendingEarnings(): Observable<any[]> {
    return this.api.get<any[]>('Withdrawal/pending-earnings');
  }

  approvePendingEarning(billingId: string): Observable<any> {
    return this.api.post(`Withdrawal/approve-earning/${billingId}`);
  }
}