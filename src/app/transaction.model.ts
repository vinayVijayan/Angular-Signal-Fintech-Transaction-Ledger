export type TxStatus = 'SETTLED' | 'PENDING' | 'FLAGGED';

export interface Transaction {
  id: string;
  time: string;
  merchant: string;
  method: 'UPI' | 'NEFT' | 'RTGS' | 'CARD';
  amount: number;
  status: TxStatus;
  riskNote?: string;
}