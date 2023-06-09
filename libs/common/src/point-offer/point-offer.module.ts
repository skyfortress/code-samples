import { ActivityModule } from '@app/activity/activity.module';
import { AuthModule } from '@app/auth/auth.module';
import { RbacModule } from '@app/rbac/rbac.module';
import { TransactionModule } from '@app/transaction/transaction.module';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PointOfferSchema, PointOfferToken } from './entities/point-offer.schema';
import { PointOfferResolver } from './point-offer.resolver';
import { PointOfferService } from './point-offer.service';

@Module({
  controllers: [],
  imports: [
    AuthModule,
    RbacModule,
    MongooseModule.forFeature([{ name: PointOfferToken, schema: PointOfferSchema }]),
    ActivityModule,
    forwardRef(() => TransactionModule),
  ],
  providers: [PointOfferResolver, PointOfferService],
  exports: [MongooseModule, PointOfferService],
})
export class PointOfferModule {}
