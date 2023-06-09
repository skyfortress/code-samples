import { ActivityService } from '@app/activity/activity.service';
import { Activities } from '@app/activity/types';
import { User, UserModel, UserToken } from '@app/auth/entities/user.schema';
import { buildPagination } from '@app/common/helpers/helpers';
import { ChangeTransactionStatusInput } from '@app/transaction/dto/change.transaction.status.input';
import { CreateTransactionInput } from '@app/transaction/dto/create.transaction.input';
import { PendingTransactionDto } from '@app/transaction/dto/pending-transaction.dto';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserInputError } from 'apollo-server-express';
import { ObjectId } from 'mongodb';

import { PendingTransactionsQuery } from './dto/pending-transaction.list.input';
import { PendingTransactionModel, PendingTransactionToken } from './entities/pending-transaction.schema';
import { TransactionsService } from './transaction.service';
import { QueuedTransaction, StoredTransactionStatuses } from './types';

@Injectable()
export class PendingTransactionsService {
  constructor(
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionService: TransactionsService,
    private readonly activityService: ActivityService,
    @InjectModel(PendingTransactionToken) private pendingTransactionModel: PendingTransactionModel,
    @InjectModel(UserToken) private userModel: UserModel,
  ) {}

  async createPendingTransaction(author: User, member: User, input: CreateTransactionInput) {
    await this.activityService.log({
      author,
      resource: member._id,
      type: Activities.addPendingTransaction,
      newValue: input,
    });

    return this.pendingTransactionModel.create({
      ...input,
      originRef: author._id,
      status: StoredTransactionStatuses.pending,
    });
  }

  async createFailedTransaction(input: QueuedTransaction) {
    if (input._id) {
      const existingTransaction = await this.pendingTransactionModel.findById(input._id);
      existingTransaction.status = StoredTransactionStatuses.failed;
      existingTransaction.retries += 1;
      return existingTransaction.save();
    }
    return this.pendingTransactionModel.create({
      ...input,
      status: StoredTransactionStatuses.failed,
    });
  }

  async list(_: User, dto: PendingTransactionsQuery) {
    const query = this.pendingTransactionModel.find();

    if (dto.search?.statuses && dto.search.statuses.length > 0) {
      query.where({ status: { $in: dto.search.statuses } });
    }

    const total = await this.pendingTransactionModel.find().merge(query).countDocuments().exec();

    const res = this.pendingTransactionModel
      .find()
      .merge(query)
      .sort({ createdAt: -1 })
      .skip(dto.pagination?.offset)
      .limit(dto.pagination?.limit);

    return {
      pendingTransactions: await res.exec(),
      pagination: buildPagination(total, dto.pagination),
    };
  }

  async getTransactionsForMember(loyaltyId: string): Promise<PendingTransactionDto[]> {
    const res = await this.pendingTransactionModel.find({
      loyaltyId: loyaltyId,
      status: { $in: [StoredTransactionStatuses.pending, StoredTransactionStatuses.failed] },
    });
    return res;
  }

  async updatePendingTransaction(user: User, dto: ChangeTransactionStatusInput): Promise<boolean> {
    const transaction = await this.pendingTransactionModel.findById(dto.id);
    if (!transaction) {
      throw new UserInputError('Transaction not found', { invalidArg: 'id' });
    }

    const { status: previousStatus } = transaction;

    transaction.status = dto.status;
    transaction.modifiedBy = user;

    await transaction.save();

    const creator = await this.userModel.findById(new ObjectId(transaction.originRef));
    const member = await this.userModel.findOne({ loyaltyId: transaction.loyaltyId });

    if (dto.status === StoredTransactionStatuses.approved) {
      if (previousStatus === StoredTransactionStatuses.pending) {
        await this.transactionService.addTransaction(creator, member, transaction.toObject());
      }
      if (previousStatus === StoredTransactionStatuses.failed) {
        await this.transactionService.addTransactionIntoQueue(transaction);
      }
    }

    await this.activityService.log({
      author: user,
      resource: new ObjectId(member._id),
      type: Activities.changeTransactionStatus,
      oldValue: transaction.toObject(),
      newValue: {
        ...transaction.toObject(),
        status: dto.status,
      },
    });

    return true;
  }
}
