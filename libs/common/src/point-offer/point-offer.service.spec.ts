import { User, UserSchema } from '@app/auth/entities/user.schema';
import { PointOffer, PointOfferSchema } from '@app/point-offer/entities/point-offer.schema';
import { PointOfferService } from '@app/point-offer/point-offer.service';
import { PointOfferName } from '@app/point-offer/types';
import { Currency, Origin, TransactionType } from '@app/transaction/types';
import { connect, disconnect, model } from 'mongoose';

describe('Point offers service', () => {
  let service: PointOfferService;
  let offer: PointOffer;

  const PointOfferModel = model<PointOffer>('PointOffer', PointOfferSchema);
  const UserModel = model<User>('User', UserSchema);

  const addTransactionIntoQueue = jest.fn();

  beforeAll(async () => {
    await connect(globalThis.__MONGOD__.getUri());

    offer = await new PointOfferModel({
      systemName: PointOfferName.pearl,
      points: 100,
      isActive: true,
    }).save();

    service = new PointOfferService(PointOfferModel, UserModel, {} as any, { addTransactionIntoQueue } as any);
  });

  afterAll(async () => {
    await disconnect();
  });

  describe('applyPointOffers', () => {
    it('should not apply same offer twice', async () => {
      addTransactionIntoQueue.mockClear();
      const user = await new UserModel({
        loyaltyId: '123456789',
        usedOffers: [{ offerId: offer._id }],
        points: 0,
        isActive: true,
      }).save();

      await service.applyPointOffers(user, [PointOfferName.pearl]);

      const updatedUser = await UserModel.findById(user._id);
      const updatedOffer = await PointOfferModel.findById(offer._id);

      expect(updatedUser.usedOffers).toHaveLength(1);
      expect(updatedOffer.usedNumber).toBe(0);
      expect(addTransactionIntoQueue).toBeCalledTimes(0);
    });

    it('should not throw an error on empty offers array', async () => {
      addTransactionIntoQueue.mockClear();
      const user = await new UserModel({
        loyaltyId: '123456789',
        usedOffers: [],
        points: 0,
        isActive: true,
      }).save();

      await service.applyPointOffers(user, []);

      const updatedUser = await UserModel.findById(user._id);
      const updatedOffer = await PointOfferModel.findById(offer._id);

      expect(updatedUser.usedOffers).toHaveLength(0);
      expect(updatedOffer.usedNumber).toBe(0);
      expect(addTransactionIntoQueue).toBeCalledTimes(0);
    });

    it('should not throw an error on missing offer', async () => {
      addTransactionIntoQueue.mockClear();
      const user = await new UserModel({
        loyaltyId: '123456789',
        usedOffers: [],
        points: 0,
        isActive: true,
      }).save();

      await service.applyPointOffers(user, ['missing']);

      const updatedUser = await UserModel.findById(user._id);
      const updatedOffer = await PointOfferModel.findById(offer._id);

      expect(updatedUser.usedOffers).toHaveLength(0);
      expect(updatedOffer.usedNumber).toBe(0);
      expect(addTransactionIntoQueue).toBeCalledTimes(0);
    });

    it('should apply point offer', async () => {
      addTransactionIntoQueue.mockClear();
      const user = await new UserModel({
        loyaltyId: '123456789',
        usedOffers: [],
        points: 0,
        isActive: true,
      }).save();

      await service.applyPointOffers(user, [PointOfferName.pearl]);

      const updatedUser = await UserModel.findById(user._id);
      const updatedOffer = await PointOfferModel.findById(offer._id);

      expect(updatedUser.usedOffers).toHaveLength(1);
      expect(updatedOffer.usedNumber).toBe(1);
      expect(addTransactionIntoQueue).toBeCalledTimes(1);

      const addedTransaction = addTransactionIntoQueue.mock.calls[0][0];

      expect(addedTransaction).toHaveProperty('loyaltyId', user.loyaltyId);
      expect(addedTransaction).toHaveProperty('transactionType', TransactionType.payment);
      expect(addedTransaction).toHaveProperty('origin', Origin.pearl);
      expect(addedTransaction).toHaveProperty('originRef', offer._id);
      expect(addedTransaction).toHaveProperty('currency', Currency.points);
      expect(addedTransaction).toHaveProperty('amount', offer.points);
      expect(addedTransaction).toHaveProperty('loyaltyId', user.loyaltyId);
      expect(addedTransaction).toHaveProperty('transactionDateTime');
    });

    it('should apply point offer by email', async () => {
      addTransactionIntoQueue.mockClear();
      const user = await new UserModel({
        email: 'test@test.com',
        loyaltyId: '123456789',
        usedOffers: [],
        points: 0,
        isActive: true,
      }).save();
      await PointOfferModel.updateOne({ _id: offer._id }, { $set: { usedNumber: 0 } });

      await service.applyPointOffersByEmail(user.email, [PointOfferName.pearl]);

      const updatedUser = await UserModel.findById(user._id);
      const updatedOffer = await PointOfferModel.findById(offer._id);

      expect(updatedUser.usedOffers).toHaveLength(1);
      expect(updatedOffer.usedNumber).toBe(1);
      expect(addTransactionIntoQueue).toBeCalledTimes(1);

      const addedTransaction = addTransactionIntoQueue.mock.calls[0][0];

      expect(addedTransaction).toHaveProperty('loyaltyId', user.loyaltyId);
      expect(addedTransaction).toHaveProperty('transactionType', TransactionType.payment);
      expect(addedTransaction).toHaveProperty('origin', Origin.pearl);
      expect(addedTransaction).toHaveProperty('originRef', offer._id);
      expect(addedTransaction).toHaveProperty('currency', Currency.points);
      expect(addedTransaction).toHaveProperty('amount', offer.points);
      expect(addedTransaction).toHaveProperty('loyaltyId', user.loyaltyId);
      expect(addedTransaction).toHaveProperty('transactionDateTime');
    });

    it('should not apply point offer for missing account', async () => {
      addTransactionIntoQueue.mockClear();
      await PointOfferModel.updateOne({ _id: offer._id }, { $set: { usedNumber: 0 } });

      await service.applyPointOffersByEmail('wrong@email.com', [PointOfferName.pearl]);

      const updatedOffer = await PointOfferModel.findById(offer._id);

      expect(updatedOffer.usedNumber).toBe(0);
      expect(addTransactionIntoQueue).toBeCalledTimes(0);
    });

    it('should not apply point offer for deactivated account', async () => {
      addTransactionIntoQueue.mockClear();
      const user = await new UserModel({
        email: 'test@test.com',
        loyaltyId: '123456789',
        usedOffers: [],
        points: 0,
        isActive: false,
      }).save();

      await PointOfferModel.updateOne({ _id: offer._id }, { $set: { usedNumber: 0 } });

      await service.applyPointOffersByEmail(user.email, [PointOfferName.pearl]);

      const updatedUser = await UserModel.findById(user._id);
      const updatedOffer = await PointOfferModel.findById(offer._id);

      expect(updatedUser.usedOffers).toHaveLength(0);
      expect(updatedOffer.usedNumber).toBe(0);
      expect(addTransactionIntoQueue).toBeCalledTimes(0);
    });

    it('should not apply deactivated point offer', async () => {
      addTransactionIntoQueue.mockClear();
      const user = await new UserModel({
        email: 'test@test.com',
        loyaltyId: '123456789',
        usedOffers: [],
        points: 0,
        isActive: true,
      }).save();

      await PointOfferModel.updateOne({ _id: offer._id }, { $set: { usedNumber: 0, isActive: false } });

      await service.applyPointOffersByEmail(user.email, [PointOfferName.pearl]);

      const updatedUser = await UserModel.findById(user._id);
      const updatedOffer = await PointOfferModel.findById(offer._id);

      expect(updatedUser.usedOffers).toHaveLength(0);
      expect(updatedOffer.usedNumber).toBe(0);
      expect(addTransactionIntoQueue).toBeCalledTimes(0);
    });
  });
});
