import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletService } from '../../../core/services/wallet.service';
import { TranslationService } from '../../../core/services/translation.service';
import { InvoiceDto } from '../../../core/models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  private readonly walletService = inject(WalletService);
  readonly i18n = inject(TranslationService);

  readonly isLoading = signal(false);
  readonly invoices = signal<InvoiceDto[]>([]);

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.isLoading.set(true);
    this.walletService.getInvoices(1, 100).subscribe({
      next: (res: any) => {
        this.invoices.set(res?.data || res?.items || res || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getInvoiceStatusLabel(status: number): string {
    const labels: Record<number, string> = {
      0: 'معلق بانتظار السداد',
      1: 'مدفوع ومسدد',
      2: 'فشل السداد',
      3: 'ملغى'
    };
    return labels[status] || 'غير معروف';
  }

  t(key: string): string {
    return this.i18n.translate(key);
  }
}
