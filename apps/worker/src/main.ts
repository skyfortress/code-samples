import { LoggerService } from '@app/common/logger/logger.service';
import { ConfigService } from '@app/config/config.service';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule, {
    bufferLogs: true,
  });
  app.useLogger(new LoggerService(app.get<ConfigService>(ConfigService)));
  const config = app.get<ConfigService>(ConfigService);
  await app.listen(config.envConfig.WORKER_PORT);
}
bootstrap();
