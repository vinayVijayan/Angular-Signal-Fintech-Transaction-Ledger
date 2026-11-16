import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LedgerService } from './ledger.service';
import { Transaction, TxStatus } from './transaction.model';
import { CurrencyPipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  imports: [CurrencyPipe,ScrollingModule],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
readonly store = inject(LedgerService);
  readonly tabs: (TxStatus | 'ALL')[] = ['ALL', 'SETTLED', 'PENDING', 'FLAGGED'];

  trackById(_index: number, item: Transaction): string {
    return item.id;
  }
}
