import { PaginationInput } from '@app/common/dto/pagination.dto';
import { StoredTransactionStatuses } from '@app/transaction/types';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class PendingTransactionsSearch {
  @Field(() => [StoredTransactionStatuses], { nullable: true })
  statuses: StoredTransactionStatuses[];
}

@InputType()
export class PendingTransactionsQuery {
  @Field(() => PendingTransactionsSearch)
  search?: PendingTransactionsSearch;

  @Field(() => PaginationInput)
  pagination: PaginationInput;
}
