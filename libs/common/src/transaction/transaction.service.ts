import { ActivityService } from '@app/activity/activity.service';
import { Activities } from '@app/activity/types';
import { User, UserModel, UserToken } from '@app/auth/entities/user.schema';
import { CSVExportable, CsvRow } from '@app/common/csv-export/types';
import { MemberService } from '@app/member/member.service';
import { RbacService } from '@app/rbac/rbac.service';
import { PermissionsEnum } from '@app/rbac/types';
import { CreateTransactionInput } from '@app/transaction/dto/create.transaction.input';
import { PendingTransactionsService } from '@app/transaction/pending-transaction.service';
import { Origin, QueuedTransaction, TRANSACTIONS_QUEUE_KEY, TransactionType } from '@app/transaction/types';
import { write as csvWrite } from '@fast-csv/format';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SqsService } from '@ssut/nestjs-sqs';
import { Response } from 'express';
import { DateTime } from 'luxon';
import { ObjectId, UpdateResult } from 'mongodb';

import { Transaction } from './dto/transaction.dto';
import { TransactionModel, TransactionToken } from './entities/transaction.schema';
import { TransactionListService } from './transaction.list.service';

@Injectable()
export class TransactionsService implements CSVExportable<Transaction> {
  constructor(
    private readonly sqsService: SqsService,
    private readonly rbacService: RbacService,
    private readonly activityService: ActivityService,
    private readonly pendingTransactionService: PendingTransactionsService,
    private readonly transactionListService: TransactionListService,
    @Inject(forwardRef(() => MemberService)) private readonly memberService: MemberService,
    @InjectModel(TransactionToken) private transactionModel: TransactionModel,
    @InjectModel(UserToken) private userModel: UserModel,
  ) {}

  async addTransactionIntoQueue(data: QueuedTransaction) {
    await this.sqsService.send(TRANSACTIONS_QUEUE_KEY, {
      id: new ObjectId().toString(),
      groupId: data.loyaltyId, //transactions for different users can pe processed in parallel
      deduplicationId: new ObjectId().toString(),
      body: [
        {
          _id: data._id,
          loyaltyId: data.loyaltyId,
          originalTransactionId: data.originalTransactionId,
          transactionType: data.transactionType,
          transactionDateTime: data.transactionDateTime,
          amount: data.amount,
          currency: data.currency,
          orderNumber: data.orderNumber,
          reason: data.reason,
          eventId: data.eventId,
          origin: data.origin,
          originRef: data.originRef,
        } as QueuedTransaction,
      ],
    });
  }

  async processTransaction(data: QueuedTransaction[]) {
    const session = await this.transactionModel.db.startSession();
    session.startTransaction();
    try {
      for (const transaction of data) {
        if (await this.memberService.findByLoyaltyId(transaction.loyaltyId, false)) {
          let points = transaction.points ?? Math.round(transaction.amount);

          if (transaction.transactionType === TransactionType.chargeback) {
            points = -Math.abs(points);
          }

          const instance = new this.transactionModel({
            ...transaction,
            points,
          });

          await this.transactionModel.create([instance], { session });
          await this.memberService.addPoints(transaction.loyaltyId, points, session);
        } else {
          Logger.error('Transaction has wrong loyalty id', transaction);
        }
      }

      await session.commitTransaction();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      await session.endSession();
    }
  }

  public async addTransactionSafely(user: User, dto: CreateTransactionInput) {
    const member = await this.memberService.findByLoyaltyId(dto.loyaltyId);
    if (
      !(await this.rbacService.hasPermission(user, PermissionsEnum.addLargeTransaction, {
        amount: dto.amount,
      }))
    ) {
      await this.pendingTransactionService.createPendingTransaction(user, member, dto);
    } else {
      await this.addTransaction(user, member, dto);
    }

    return true;
  }

  public async addTransaction(user: User, member: User, dto: CreateTransactionInput) {
    await this.activityService.log({
      author: user,
      resource: member._id,
      type: Activities.addTransaction,
      oldValue: null,
      newValue: dto,
    });
    await this.addTransactionIntoQueue({
      ...dto,
      transactionDateTime: new Date(),
      originRef: user._id.toString(),
      origin: Origin.diamonddesk,
    });

    return true;
  }

  public async swapLoyaltyId(oldId: string, newId: string): Promise<UpdateResult> {
    return this.transactionModel.updateMany({ loyaltyId: oldId }, { $set: { loyaltyId: newId } });
  }

  async csvTransform(transact: Transaction, callback?: (reject: null, resolve: CsvRow) => void) {
    const transactionConsumer = await this.userModel.findOne({ loyaltyId: transact.loyaltyId });
    const author = await this.userModel.findOne({ _id: new ObjectId(transact.originRef) });

    callback(null, {
      LoyaltyId: transact.loyaltyId,
      'Transaction type': transact.transactionType,
      Amount: transact.amount,
      Currency: transact.currency,
      'Order Number': transact.orderNumber,
      Reason: transact.reason,
      Origin: transact.origin,
      Created: (transact.transactionDateTime ?? transact.createdAt).toLocaleString(),
      Author: author ? `${author?.email}; ${author?.firstName} ${author?.lastName}` : '',
      'Loyalty member': `Email: ${transactionConsumer.email}, User: ${transactionConsumer.firstName} ${transactionConsumer.lastName}`,
      'Member Points': transact.cumulativePoints,
      Level: transact.level.displayName,
    });
  }

  async downloadCsv(loyaltyId: string, res: Response): Promise<Response> {
    const transactions = await this.transactionListService.getTransactions({ loyaltyId });

    const fileName = `${loyaltyId}_transactions[${DateTime.now().toFormat('yLLLdd_HH-mm-ss')}].csv`;

    res.header('Content-Type', 'text/csv');
    res.setHeader('Content-disposition', `attachment; filename=${fileName}`);

    const transformer = (t: Transaction, cb) => this.csvTransform(t, cb);
    return csvWrite(transactions, { headers: true }).transform(transformer).pipe(res);
  }

  public deleteTransactionsByLoyaltyId(loyaltyId: string) {
    return this.transactionModel.deleteMany({ loyaltyId });
  }
}
