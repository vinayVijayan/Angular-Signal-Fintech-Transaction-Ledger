/// <reference lib="webworker" />

import { Transaction, TxStatus } from "./transaction.model";

addEventListener('message', ({ data }) => {
if (data?.type === 'INIT_ROWS') {
    const rows = generateInitialRows(data.count ?? 50000);
    postMessage({ type: 'ROWS_READY', payload: rows });
  }
});

function generateInitialRows(count: number): Transaction[] {
  const merchants = ['Razorpay Nodal', 'HDFC Treasury', 'Zerodha Clearing', 'PayU Escrow', 'Axis Merchant'];
  const methods: Transaction['method'][] = ['UPI', 'NEFT', 'RTGS', 'CARD'];

  return Array.from({ length: count }, (_, i) => {
    const status: TxStatus = i % 11 === 0 ? 'FLAGGED' : i % 5 === 0 ? 'PENDING' : 'SETTLED';
    return {
      id: `TXN-${100500 + i}`,
      time: new Date(Date.now() - i * 30000).toLocaleTimeString(),
      merchant: merchants[i % merchants.length],
      method: methods[i % methods.length],
      amount: Math.floor(1500 + Math.random() * 250000),
      status,
      riskNote: status === 'FLAGGED' ? 'Unusual transfer amount' : undefined,
    };
  });
}
