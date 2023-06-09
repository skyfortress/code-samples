import { User, UserSchema, UserToken } from '@app/auth/entities/user.schema';
import { Level, LevelSchema, LevelToken } from '@app/level/entities/level.schema';
import { LevelsService } from '@app/level/levels.service';
import { Transaction, TransactionSchema, TransactionToken } from '@app/transaction/entities/transaction.schema';
import { TransactionListService } from '@app/transaction/transaction.list.service';
import { connect, disconnect, model } from 'mongoose';

import { Currency, TransactionType } from './types';

describe('Transaction List service', () => {
  const UserModel = model<User>(UserToken, UserSchema);
  const TransactionModel = model<Transaction>(TransactionToken, TransactionSchema);
  const LevelModel = model<Level>(LevelToken, LevelSchema);

  beforeAll(async () => {
    await connect(globalThis.__MONGOD__.getUri());
  });

  beforeEach(async () => {
    await TransactionModel.deleteMany({});
    await LevelModel.deleteMany({});
  });

  afterAll(() => disconnect());

  describe('getTransactions', () => {
    const levelService = new LevelsService(LevelModel, {} as any);
    const service = new TransactionListService(TransactionModel, levelService);

    it('should return specific loyaltyId transactions', async () => {
      const loyaltyId = 'testId';
      await TransactionModel.insertMany([
        {
          loyaltyId: 'testId',
          points: 100,
          amount: 100,
          currency: Currency.points,
          transactionType: TransactionType.payment,
        },
        {
          loyaltyId: 'testId_2',
          points: 50,
          amount: 50,
          currency: Currency.USD,
          transactionType: TransactionType.chargeback,
        },
      ]);

      const list = await service.getTransactions({ loyaltyId });
      expect(list.length).toBe(1);

      expect(list[0].points).toBe(100);
    });

    it('should accumulate points', async () => {
      await TransactionModel.insertMany([
        {
          loyaltyId: 'testId',
          points: 100,
          amount: 100,
          currency: Currency.points,
          transactionType: TransactionType.payment,
        },
        {
          loyaltyId: 'testId',
          points: 50,
          amount: 50,
          currency: Currency.USD,
          transactionType: TransactionType.payment,
        },
        {
          loyaltyId: 'testId',
          points: -120,
          amount: 120,
          currency: Currency.points,
          transactionType: TransactionType.chargeback,
        },
        {
          loyaltyId: 'testId_2',
          points: 50,
          amount: 50,
          currency: Currency.USD,
          transactionType: TransactionType.chargeback,
        },
      ]);

      const user = await new UserModel({
        loyaltyId: 'testId',
        points: 0,
        isActive: true,
      }).save();

      const list = await service.getTransactions(user);

      expect(list.length).toBe(3);
      expect(list[2].cumulativePoints).toBe(30);
    });

    it('should calculate levels for accumulativePoints correctly', async () => {
      await TransactionModel.insertMany([
        {
          loyaltyId: 'testId',
          points: 100,
          amount: 100,
          currency: Currency.points,
          transactionType: TransactionType.payment,
        },
        {
          loyaltyId: 'testId',
          points: 150,
          amount: 150,
          currency: Currency.USD,
          transactionType: TransactionType.payment,
        },
        {
          loyaltyId: 'testId',
          points: -120,
          amount: 120,
          currency: Currency.points,
          transactionType: TransactionType.chargeback,
        },
        {
          loyaltyId: 'testId_2',
          points: 50,
          amount: 50,
          currency: Currency.USD,
          transactionType: TransactionType.chargeback,
        },
      ]);

      await LevelModel.insertMany([
        {
          title: 'L1',
          pointsThreshold: 101,
          displayName: 'L1',
          systemName: 'L1',
          country: 'US',
        },
        {
          title: 'L2',
          pointsThreshold: 201,
          displayName: 'L2',
          systemName: 'L2',
          country: 'US',
        },
        {
          title: 'L3',
          pointsThreshold: 301,
          displayName: 'L3',
          systemName: 'L3',
          country: 'US',
        },
      ]);

      const user = await new UserModel({ loyaltyId: 'testId' }).save();

      const list = await service.getTransactions(user);
      expect(list.length).toBe(3);

      expect(list[0].level.displayName).toBe('L1');
      expect(list[1].level.displayName).toBe('L2');
      expect(list[2].level.displayName).toBe('L1');
    });
  });
});
