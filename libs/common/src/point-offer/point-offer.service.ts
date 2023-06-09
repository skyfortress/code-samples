import { ActivityService } from '@app/activity/activity.service';
import { Activities } from '@app/activity/types';
import { MemberPointOfferClass, User, UserModel, UserToken } from '@app/auth/entities/user.schema';
import { PointOfferDto } from '@app/point-offer/dto/point-offer.dto';
import { PointOfferName } from '@app/point-offer/types';
import { TransactionsService } from '@app/transaction/transaction.service';
import { Currency, Origin, TransactionType } from '@app/transaction/types';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';

import { UpdatePointOfferInput } from './dto/update.point-offer.input';
import { PointOffer, PointOfferModel, PointOfferToken } from './entities/point-offer.schema';

@Injectable()
export class PointOfferService {
  constructor(
    @InjectModel(PointOfferToken) private pointOfferModel: PointOfferModel,
    @InjectModel(UserToken) private userModel: UserModel,
    private readonly activityService: ActivityService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionService: TransactionsService,
  ) {}

  async view(id: ObjectId): Promise<PointOfferDto> {
    return this.pointOfferModel.findById(id);
  }

  async list(): Promise<PointOffer[]> {
    return this.pointOfferModel.find({}).sort({ _id: -1 }).exec();
  }

  async update(author: User, dto: UpdatePointOfferInput) {
    const offer = await this.pointOfferModel.findById(dto._id);
    if (!offer) {
      throw new NotFoundException();
    }

    await this.activityService.log({
      author,
      type: Activities.updatePointOffer,
      oldValue: offer,
      newValue: dto,
    });

    if (dto.points > 0) {
      offer.points = dto.points;
    }

    offer.isActive = dto.isActive;

    return offer.save();
  }

  async applyPointOffers(user: User, possibleOfferNames: string[]): Promise<void> {
    if (!user.isActive) {
      return;
    }
    const offers = await this.pointOfferModel.find({
      systemName: { $in: possibleOfferNames as PointOfferName[] },
      isActive: true,
    });

    const offersToApply = offers.filter(
      (el) => !user.usedOffers.some((memberOffer) => memberOffer.offerId.equals(el._id)),
    );

    if (offersToApply.length === 0) {
      return;
    }

    const appliedOffers: MemberPointOfferClass[] = [];
    for (const offer of offersToApply) {
      const transactionDateTime = new Date();
      await this.transactionService.addTransactionIntoQueue({
        transactionType: TransactionType.payment,
        loyaltyId: user.loyaltyId,
        amount: offer.points,
        currency: Currency.points,
        origin: Origin.pearl,
        originRef: offer._id,
        transactionDateTime,
      });
      await this.pointOfferModel.updateOne({ _id: offer._id }, { $inc: { usedNumber: 1 } });
      appliedOffers.push({
        offerId: offer._id,
        createdAt: transactionDateTime,
      });
    }

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          usedOffers: [...user.usedOffers, ...appliedOffers],
        },
      },
    );
  }

  async applyPointOffersByEmail(email: string, possibleOfferNames: string[]): Promise<void> {
    const user = await this.userModel.findOne({ email, isActive: true });
    if (!user) {
      return;
    }
    return this.applyPointOffers(user, possibleOfferNames);
  }
}
