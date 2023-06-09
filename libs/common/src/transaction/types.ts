import { CreateTransactionInput } from '@app/transaction/dto/create.transaction.input';
import { registerEnumType } from '@nestjs/graphql';

export const TRANSACTIONS_QUEUE_KEY = 'transactions-queue';

// used by LOC, be careful when modify
export type QueuedTransaction = CreateTransactionInput & {
  origin: Origin;
  originRef?: string;
  _id?: string;
  points?: number;
  transactionDateTime?: Date | string;
};

export enum StoredTransactionStatuses {
  'failed' = 'failed',
  'pending' = 'pending',
  'approved' = 'approved',
  'rejected' = 'rejected',
}

export enum Reason {
  'manualStorePurchase' = 'manualStorePurchase',
  'manualOnlinePurchase' = 'manualOnlinePurchase',
  'mistakeChargeback' = 'mistakeChargeback',
  'diamondNexus' = 'diamondNexus',
}

export enum TransactionType {
  'payment' = 'payment',
  'chargeback' = 'chargeback',
}

export enum Origin {
  'pearl' = 'pearl',
  'diamonddesk' = 'diamonddesk',
  'instore' = 'instore',
  'online' = 'online',
  'diamondnexus' = 'diamondnexus',
}

export enum Currency {
  'USD' = 'USD',
  'points' = 'points',
}

registerEnumType(Currency, { name: 'Currency' });
registerEnumType(Origin, { name: 'Origin' });
registerEnumType(Reason, { name: 'Reason' });
registerEnumType(TransactionType, { name: 'TransactionType' });

registerEnumType(StoredTransactionStatuses, { name: 'StoredTransactionStatuses' });
