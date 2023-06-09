import { StoredTransactionStatuses } from '@app/transaction/types';
import { Field, ID, InputType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';

@InputType()
export class ChangeTransactionStatusInput {
  @Field(() => ID)
  id: ObjectId;

  @Field(() => StoredTransactionStatuses)
  status: StoredTransactionStatuses;
}
