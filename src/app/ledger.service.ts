import { Injectable, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Transaction, TxStatus } from './transaction.model';

@Injectable({ providedIn: 'root' })
export class LedgerService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private timerId: ReturnType<typeof setInterval> | null = null;
  private worker: Worker | null = null;

  readonly transactions = signal<Transaction[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly searchText = signal('');
  readonly statusFilter = signal<TxStatus | 'ALL'>('ALL');
  readonly role = signal<'ANALYST' | 'APPROVER'>('APPROVER');
  readonly isLive = signal(false);

  readonly filteredTransactions = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    const status = this.statusFilter();

    return this.transactions().filter(tx => {
      const matchesStatus = status === 'ALL' || tx.status === status;
      const matchesQuery =
        !query ||
        tx.id.toLowerCase().includes(query) ||
        tx.merchant.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  });

  readonly kpis = computed(() => {
    const rows = this.filteredTransactions();
    return {
      totalVolume: rows.reduce((sum, tx) => sum + tx.amount, 0),
      settledCount: rows.filter(tx => tx.status === 'SETTLED').length,
      flaggedCount: rows.filter(tx => tx.status === 'FLAGGED').length,
    };
  });

  constructor() {
    this.initWorker(50000);
  }

  private initWorker(count: number): void {
    if (isPlatformBrowser(this.platformId) && typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./ledger.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (data?.type === 'ROWS_READY') {
          this.transactions.set(data.payload);
          this.isLoading.set(false);
        }
      };
      this.worker.postMessage({ type: 'INIT_ROWS', count });
    } else {
      this.isLoading.set(false);
    }
  }

  toggleLiveStream(): void {
    if (this.isLive()) {
      this.stopStream();
    } else {
      this.isLive.set(true);
      this.timerId = setInterval(() => this.addTransaction(false), 1000);
    }
  }

  addTransaction(forceFraud: boolean): void {
    const merchants = ['Razorpay Nodal', 'HDFC Treasury', 'Zerodha Clearing', 'PayU Escrow', 'ICICI Corp'];
    const methods: Transaction['method'][] = ['UPI', 'NEFT', 'RTGS', 'CARD'];
    const isFlagged = forceFraud || Math.random() > 0.85;

    const newTx: Transaction = {
      id: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
      time: new Date().toLocaleTimeString(),
      merchant: forceFraud ? 'Unverified Offshore PSP' : merchants[Math.floor(Math.random() * merchants.length)],
      method: forceFraud ? 'RTGS' : methods[Math.floor(Math.random() * methods.length)],
      amount: forceFraud ? 950000 : Math.floor(2000 + Math.random() * 150000),
      status: isFlagged ? 'FLAGGED' : 'SETTLED',
      riskNote: isFlagged ? 'High-value velocity alert' : undefined,
    };

    this.transactions.update(list => [newTx, ...list]);
  }

  approveTransaction(id: string): void {
    if (this.role() !== 'APPROVER') return;
    this.transactions.update(list =>
      list.map(tx => (tx.id === id ? { ...tx, status: 'SETTLED', riskNote: undefined } : tx))
    );
  }

  exportCsv(): void {
    const headers = 'ID,Time,Merchant,Method,Amount,Status\n';
    const rows = this.filteredTransactions()
      .map(t => `${t.id},${t.time},"${t.merchant}",${t.method},${t.amount},${t.status}`)
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private stopStream(): void {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
    this.isLive.set(false);
  }

  ngOnDestroy(): void {
    this.stopStream();
    this.worker?.terminate();
  }
}