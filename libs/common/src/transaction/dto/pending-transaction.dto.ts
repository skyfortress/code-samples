import { Author } from '@app/common/dto/author.dto';
import { Pagination } from '@app/common/dto/pagination.dto';
import { Transaction } from '@app/transaction/dto/transaction.dto';
import { StoredTransactionStatuses } from '@app/transaction/types';
import { Field, ObjectType, PickType } from '@nestjs/graphql';

@ObjectType()
export class PendingTransactionDto extends PickType(Transaction, [
  '_id',
  'createdAt',
  'amount',
  'transactionType',
  'loyaltyId',
  'reason',
  'currency',
  'orderNumber',
]) {
  @Field(() => StoredTransactionStatuses)
  status: StoredTransactionStatuses;

  @Field(() => Author, { nullable: true })
  approver?: Author;

  @Field(() => Author, { nullable: true })
  member?: Author;

  @Field(() => Author, { nullable: true })
  author?: Author;

  @Field(() => Number, { defaultValue: 0 })
  retries?: number;
}

@ObjectType()
export class PaginatedPendingTransactions {
  @Field(() => [PendingTransactionDto])
  pendingTransactions: PendingTransactionDto[];

  @Field(() => Pagination)
  pagination: Pagination;
}
