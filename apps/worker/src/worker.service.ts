import { ConfigService } from '@app/config/config.service';
import { PointOfferService } from '@app/point-offer/point-offer.service';
import { PEARL_EVENTS_QUEUE_KEY, PointOfferName } from '@app/point-offer/types';
import { TransactionsService } from '@app/transaction/transaction.service';
import { QueuedTransaction, TRANSACTIONS_QUEUE_KEY } from '@app/transaction/types';
import { Injectable, Logger } from '@nestjs/common';
import { SqsConsumerEventHandler, SqsMessageHandler } from '@ssut/nestjs-sqs';

@Injectable()
export class WorkerService {
  constructor(
    private readonly configService: ConfigService,
    private readonly transactionService: TransactionsService,
    private readonly pointOfferService: PointOfferService,
  ) {}

  @SqsMessageHandler(TRANSACTIONS_QUEUE_KEY, false)
  async handleTransactionMessage(message: AWS.SQS.Message) {
    const obj = JSON.parse(message.Body) as QueuedTransaction[];
    Logger.debug('Received transactions', obj);
    await this.transactionService.processTransaction(obj);
  }

  @SqsConsumerEventHandler(TRANSACTIONS_QUEUE_KEY, /** eventName: */ 'processing_error')
  public onTransactionProcessingError(error: Error, message: AWS.SQS.Message) {
    Logger.error(error.message, error.stack, message);
  }

  @SqsMessageHandler(PEARL_EVENTS_QUEUE_KEY, false)
  async handlePearlMessage(message: AWS.SQS.Message) {
    try {
      const parsedMsg = JSON.parse(message.Body) as {
        Message: string;
        MessageId: string;
        Timestamp: string;
        TopicArn: string;
        Type: string;
        UnsubscribeURL: string;
      };

      const obj = JSON.parse(parsedMsg.Message) as {
        objectName: string | '/event';
        action: string | 'POST';
        user?: {
          email?: string;
        };
      };

      if (!this.configService.isProduction()) {
        Logger.debug('Got PEARL event', obj);
      }

      if (obj.objectName !== '/event' || obj.action !== 'POST' || !obj?.user?.email) {
        return;
      }

      Logger.log('Applying PEARL point offer', obj);
      await this.pointOfferService.applyPointOffersByEmail(obj.user.email.toLowerCase(), [PointOfferName.pearl]);
    } catch (error) {
      Logger.error(error?.message, error?.stack);
    }
  }
}
