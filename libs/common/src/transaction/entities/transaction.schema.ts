import { DataExtractService } from '@app/data-extract/data-extract.service';
import { Currency, Origin, Reason, TransactionType } from '@app/transaction/types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, ObjectId } from 'mongoose';

export type Transaction = TransactionClass & Document<ObjectId>;

@Schema({
  collection: 'transactions',
  timestamps: true,
})
export class TransactionClass {
  @Prop({ type: String, enum: TransactionType })
  public transactionType: TransactionType;

  @Prop()
  public transactionDateTime?: Date;

  @Prop()
  public popwalletTransactionId?: string;

  @Prop({ index: { unique: false } })
  public originalTransactionId?: string;

  @Prop({ index: { unique: false } })
  public points: number;

  @Prop()
  public amount: number;

  @Prop({ type: String, enum: Currency })
  public currency: Currency;

  @Prop({ index: { unique: false } })
  public loyaltyId: string;

  @Prop({ type: String, enum: Reason })
  public reason?: Reason;

  @Prop()
  public eventId?: string;

  @Prop()
  public orderNumber?: string;

  @Prop({ type: String, enum: Origin })
  public origin: Origin;

  @Prop()
  public originRef: string;

  @Prop()
  public createdAt: Date;

  @Prop()
  public updatedAt: Date;
}
export const TransactionToken = TransactionClass.name;
export type TransactionModel = Model<Transaction>;
export const TransactionSchema = SchemaFactory.createForClass(TransactionClass);

export const getSchema = (dataExtractService: DataExtractService) => {
  const schema = TransactionSchema;

  schema.pre('save', async function () {
    this.$locals.wasNew = this.isNew;
  });
  schema.post('save', (doc: Transaction) => {
    dataExtractService.sendEvent(TransactionToken, doc.$locals.wasNew ? 'insert' : 'update', doc);
  });
  return schema;
};
