import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../core/services/wallet.service';
import { TranslationService } from '../../../core/services/translation.service';
import { InvoiceDto } from '../../../core/models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  private readonly walletService = inject(WalletService);
  readonly i18n = inject(TranslationService);
  readonly Math = Math;

  readonly isLoading = signal(false);
  readonly transactions = signal<any[]>([]);
  readonly activeFilter = signal<'all' | 'deposit' | 'order_payment' | 'withdrawal' | 'manual' | 'refund'>('all');
  readonly searchTerm = signal('');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(50);
  readonly totalCount = signal(0);

  readonly filteredTransactions = computed(() => {
    let list = this.transactions();
    const query = this.searchTerm().trim().toLowerCase();
    if (query) {
      list = list.filter(t =>
        (t.userName || '').toLowerCase().includes(query) ||
        (t.userEmail || '').toLowerCase().includes(query) ||
        (t.notes || '').toLowerCase().includes(query) ||
        (t.kindLabel || '').toLowerCase().includes(query)
      );
    }
    return list;
  });

  readonly totalDeposits = computed(() =>
    this.transactions()
      .filter(t => t.kind === 'deposit')
      .reduce((sum, t) => sum + (t.amount || 0), 0)
  );

  readonly totalPayments = computed(() =>
    this.transactions()
      .filter(t => t.kind === 'order_payment')
      .reduce((sum, t) => sum + (t.amount || 0), 0)
  );

  readonly totalWithdrawals = computed(() =>
    this.transactions()
      .filter(t => t.kind === 'withdrawal')
      .reduce((sum, t) => sum + (t.amount || 0), 0)
  );

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.isLoading.set(true);
    const filter = this.activeFilter() === 'all' ? undefined : this.activeFilter();
    this.walletService.getAllTransactions(this.pageNumber(), this.pageSize(), filter).subscribe({
      next: (res: any) => {
        this.transactions.set(res?.items || []);
        this.totalCount.set(res?.totalCount || 0);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  setFilter(filter: 'all' | 'deposit' | 'order_payment' | 'withdrawal' | 'manual' | 'refund'): void {
    this.activeFilter.set(filter);
    this.pageNumber.set(1);
    this.loadTransactions();
  }

  changePage(page: number): void {
    this.pageNumber.set(page);
    this.loadTransactions();
  }
}
