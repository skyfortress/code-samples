import { User } from '@app/auth/entities/user.schema';
import { TransactionClass } from '@app/transaction/entities/transaction.schema';
import { StoredTransactionStatuses } from '@app/transaction/types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Document, Model, Types } from 'mongoose';

export type PendingTransaction = PendingTransactionClass & Document;

@Schema({
  collection: 'pending-transactions',
  timestamps: true,
})
export class PendingTransactionClass extends TransactionClass {
  @Prop({ type: String, enum: StoredTransactionStatuses, index: { unique: false } })
  public status: StoredTransactionStatuses;

  @Prop({ type: Types.ObjectId, ref: 'UserClass' })
  public modifiedBy?: ObjectId | User;

  @Prop({ default: 0 })
  public retries?: number;
}
export const PendingTransactionToken = PendingTransactionClass.name;
export type PendingTransactionModel = Model<PendingTransaction>;
export const PendingTransactionSchema = SchemaFactory.createForClass(PendingTransactionClass);
