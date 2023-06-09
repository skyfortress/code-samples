import { ActivityModule } from '@app/activity/activity.module';
import { AuthModule } from '@app/auth/auth.module';
import { ConfigModule } from '@app/config/config.module';
import { ConfigService } from '@app/config/config.service';
import { DataExtractModule } from '@app/data-extract/data-extract.module';
import { DataExtractService } from '@app/data-extract/data-extract.service';
import { LevelModule } from '@app/level/level.module';
import { MemberModule } from '@app/member/member.module';
import { RbacModule } from '@app/rbac/rbac.module';
import { TransactionResolver } from '@app/transaction/transaction.resolver';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SqsModule } from '@ssut/nestjs-sqs';

import { PendingTransactionSchema, PendingTransactionToken } from './entities/pending-transaction.schema';
import { getSchema, TransactionToken } from './entities/transaction.schema';
import { PendingTransactionsResolver } from './pending-transaction.resolver';
import { PendingTransactionsService } from './pending-transaction.service';
import { TransactionController } from './transaction.controller';
import { TransactionListService } from './transaction.list.service';
import { TransactionsService } from './transaction.service';
import { TRANSACTIONS_QUEUE_KEY } from './types';

@Module({
  imports: [
    AuthModule,
    ActivityModule,
    RbacModule,
    SqsModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        producers: [
          {
            name: TRANSACTIONS_QUEUE_KEY,
            queueUrl: config.envConfig.SQS_TRANSACTIONS_QUEUE_URL,
            region: config.envConfig.AWS_REGION || process.env.AWS_REGION,
          },
        ],
      }),
    }),
    MongooseModule.forFeatureAsync([
      { name: PendingTransactionToken, useFactory: () => PendingTransactionSchema },
      {
        name: TransactionToken,
        imports: [DataExtractModule],
        useFactory: getSchema,
        inject: [DataExtractService],
      },
    ]),
    forwardRef(() => MemberModule),
    LevelModule,
  ],
  providers: [
    PendingTransactionsService,
    PendingTransactionsResolver,
    TransactionsService,
    TransactionResolver,
    TransactionListService,
  ],
  exports: [MongooseModule, PendingTransactionsService, TransactionsService, TransactionListService],
  controllers: [TransactionController],
})
export class TransactionModule {}
