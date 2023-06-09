import { Currency, Reason, TransactionType } from '@app/transaction/types';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateTransactionInput {
  // used by LOC, be careful when modify
  @Field()
  loyaltyId: string;

  @Field({ nullable: true })
  originalTransactionId?: string;

  @Field(() => TransactionType)
  transactionType: TransactionType;

  @Field()
  amount: number;

  @Field(() => Currency)
  currency: Currency;

  @Field({ nullable: true })
  orderNumber?: string;

  @Field(() => Reason, { nullable: true })
  reason?: Reason;

  @Field({ nullable: true })
  eventId?: string;
}
