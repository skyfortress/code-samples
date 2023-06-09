import { CommonModule } from '@app/common/common.module';
import { ConfigModule } from '@app/config/config.module';
import { ConfigService } from '@app/config/config.service';
import { PointOfferModule } from '@app/point-offer/point-offer.module';
import { PEARL_EVENTS_QUEUE_KEY } from '@app/point-offer/types';
import { TransactionModule } from '@app/transaction/transaction.module';
import { TRANSACTIONS_QUEUE_KEY } from '@app/transaction/types';
import { Module } from '@nestjs/common';
import { SqsModule } from '@ssut/nestjs-sqs';
import { WorkerService } from '@worker/worker.service';

if (process.env.NODE_ENV === 'production') {
  require('newrelic');
}

@Module({
  imports: [
    CommonModule,
    ConfigModule,
    TransactionModule,
    PointOfferModule,
    SqsModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        consumers: [
          {
            name: TRANSACTIONS_QUEUE_KEY,
            queueUrl: config.envConfig.SQS_TRANSACTIONS_QUEUE_URL,
            region: config.envConfig.AWS_REGION || process.env.AWS_REGION,
          },
          {
            name: PEARL_EVENTS_QUEUE_KEY,
            queueUrl: config.envConfig.SQS_PEARL_QUEUE_URL,
            region: config.envConfig.AWS_REGION || process.env.AWS_REGION,
          },
        ],
      }),
    }),
  ],
  controllers: [],
  providers: [WorkerService],
  exports: [],
})
export class WorkerModule {}
