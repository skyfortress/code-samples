import { Level } from '@app/level/dto/level.dto';
import { Currency, Origin, Reason, TransactionType } from '@app/transaction/types';
import { Field, ObjectType, PickType } from '@nestjs/graphql';

@ObjectType()
export class TransactionLevel extends PickType(Level, ['icon', 'displayName'] as const) {}

@ObjectType()
export class Transaction {
  @Field()
  _id: string;

  @Field({ nullable: true })
  originalTransactionId?: string;

  @Field(() => TransactionType)
  transactionType: TransactionType;

  @Field(() => Date, { nullable: true })
  transactionDateTime?: Date;

  @Field()
  points: number;

  @Field()
  loyaltyId: string;

  @Field()
  amount: number;

  @Field(() => Currency)
  currency: Currency;

  @Field(() => Reason, { nullable: true })
  reason?: Reason;

  @Field({ nullable: true })
  orderNumber?: string;

  @Field({ nullable: true })
  eventId?: string;

  @Field(() => Origin)
  origin: Origin;

  @Field({ nullable: true })
  originRef?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => TransactionLevel)
  level: TransactionLevel;

  @Field()
  cumulativePoints: number;
}
