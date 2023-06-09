import { LevelsService } from '@app/level/levels.service';
import { Transaction, TransactionModel, TransactionToken } from '@app/transaction/entities/transaction.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Transaction as TransactionDto } from './dto/transaction.dto';

@Injectable()
export class TransactionListService {
  constructor(
    @InjectModel(TransactionToken) private transactionModel: TransactionModel,
    private readonly levelsService: LevelsService,
  ) {}

  private async _getTransactions({ loyaltyId, sort }: { loyaltyId?: string; sort?: boolean }): Promise<Transaction[]> {
    if (!loyaltyId) {
      return [];
    }

    const query = this.transactionModel.find({ loyaltyId });

    if (sort) {
      query.sort({ createdAt: -1 });
    } else {
      query.sort({ createdAt: 1 });
    }

    return query.exec();
  }

  public async getTransactions({ loyaltyId, sort = false }): Promise<TransactionDto[]> {
    if (!loyaltyId) {
      return [];
    }

    const transactions = await this._getTransactions({ loyaltyId, sort });

    const levels = await Promise.all(
      transactions.reduce(
        (acc, transaction) => {
          const levelPoints = acc.userPointsAcc + transaction.points;
          return {
            userPointsAcc: levelPoints,
            levels: [...acc.levels, this.levelsService.getLevelByPoints(levelPoints)],
          };
        },
        { userPointsAcc: 0, levels: [] },
      ).levels,
    );

    const transactionsList = transactions.reduce(
      (acc: { cumulativePoints: number; transactions: TransactionDto[] }, transaction: Transaction, idx: number) => {
        const cumulativePoints = acc.cumulativePoints + transaction.points;

        return {
          cumulativePoints: cumulativePoints,
          transactions: [
            ...acc.transactions,
            {
              ...(transaction.toObject() as Transaction),
              _id: transaction._id.toString(),
              cumulativePoints: cumulativePoints,
              level: levels[idx],
            },
          ],
        };
      },
      { cumulativePoints: 0, transactions: [] },
    );

    return transactionsList.transactions;
  }
}
