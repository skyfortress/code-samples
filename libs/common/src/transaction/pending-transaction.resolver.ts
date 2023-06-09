import { Author } from '@app/activity/entities/activity.entity';
import { InjectCurrentUser } from '@app/auth/current.user.decorator';
import { User } from '@app/auth/entities/user.schema';
import { MemberService } from '@app/member/member.service';
import { PermissionGuard } from '@app/rbac/permission.guard';
import { PermissionsEnum } from '@app/rbac/types';
import { ChangeTransactionStatusInput } from '@app/transaction/dto/change.transaction.status.input';
import { PendingTransaction } from '@app/transaction/entities/pending-transaction.schema';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';

import { PaginatedPendingTransactions, PendingTransactionDto } from './dto/pending-transaction.dto';
import { PendingTransactionsQuery } from './dto/pending-transaction.list.input';
import { PendingTransactionsService } from './pending-transaction.service';

@Resolver(() => PendingTransactionDto)
export class PendingTransactionsResolver {
  constructor(
    private readonly pendingTransactionsService: PendingTransactionsService,
    private readonly memberService: MemberService,
  ) {}

  @ResolveField(() => Author, { nullable: true })
  async approver(@Parent() parent: PendingTransaction): Promise<Author | null> {
    return this.memberService.view(parent.modifiedBy as ObjectId, false);
  }

  @ResolveField(() => Author, { nullable: true })
  async author(@Parent() parent: PendingTransaction): Promise<Author | null> {
    if (!parent.originRef) {
      return null;
    }
    return this.memberService.view(new ObjectId(parent.originRef));
  }

  @ResolveField(() => Author, { nullable: true })
  async member(@Parent() parent: PendingTransaction): Promise<Author> {
    return this.memberService.findByLoyaltyId(parent.loyaltyId, false);
  }

  @Query(() => PaginatedPendingTransactions)
  @UseGuards(PermissionGuard(PermissionsEnum.listPendingTransactions))
  async pendingTransactions(
    @InjectCurrentUser() user: User,
    @Args('data') dto: PendingTransactionsQuery,
  ): Promise<Partial<PaginatedPendingTransactions>> {
    return this.pendingTransactionsService.list(user, dto);
  }

  @Mutation(() => Boolean)
  @UseGuards(PermissionGuard(PermissionsEnum.approveTransaction))
  async changeTransactionStatus(
    @InjectCurrentUser() user: User,
    @Args('data') dto: ChangeTransactionStatusInput,
  ): Promise<boolean> {
    return this.pendingTransactionsService.updatePendingTransaction(user, dto);
  }
}
