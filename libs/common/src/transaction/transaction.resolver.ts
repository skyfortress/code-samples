import { InjectCurrentUser } from '@app/auth/current.user.decorator';
import { User } from '@app/auth/entities/user.schema';
import { Author } from '@app/common/dto/author.dto';
import { MemberService } from '@app/member/member.service';
import { PermissionGuard } from '@app/rbac/permission.guard';
import { PermissionsEnum } from '@app/rbac/types';
import { Transaction } from '@app/transaction/dto/transaction.dto';
import { Origin } from '@app/transaction/types';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { CreateTransactionInput } from './dto/create.transaction.input';
import { TransactionsService } from './transaction.service';

@Resolver(() => Transaction)
export class TransactionResolver {
  constructor(
    private readonly memberService: MemberService,
    private readonly transactionService: TransactionsService,
  ) {}

  @ResolveField(() => Author, { nullable: true })
  async author(@Parent() parent: Transaction): Promise<Author | null> {
    if (parent.origin !== Origin.diamonddesk || !parent.originRef) {
      return null;
    }

    return this.memberService.view(parent.originRef);
  }

  @Mutation(() => Boolean)
  @UseGuards(PermissionGuard(PermissionsEnum.addTransaction))
  async addTransaction(@InjectCurrentUser() user: User, @Args('data') dto: CreateTransactionInput): Promise<boolean> {
    return this.transactionService.addTransactionSafely(user, dto);
  }
}
