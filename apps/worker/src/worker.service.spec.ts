import { PointOfferName } from '@app/point-offer/types';
import { Logger } from '@nestjs/common';
import { connect, disconnect } from 'mongoose';

import { WorkerService } from './worker.service';

Logger.overrideLogger(false);

describe('Auth service', () => {
  let service: WorkerService;

  const applyPointOffersByEmail = jest.fn();

  beforeAll(async () => {
    await connect(globalThis.__MONGOD__.getUri());
    service = new WorkerService({ isProduction: () => false } as any, {} as any, { applyPointOffersByEmail } as any);
  });

  beforeEach(async () => {
    applyPointOffersByEmail.mockClear();
  });

  afterAll(() => disconnect());

  describe('handlePearlMessage', () => {
    it('should apply point offer for POST /event', async () => {
      const email = 'alexey.b+1@bilberrry.com';
      await service.handlePearlMessage({
        Body: JSON.stringify({
          Message: JSON.stringify({
            objectName: '/event',
            action: 'POST',
            user: {
              username: 'dbisso_41188b49-a5e4-49d8-9e2d-f86610ba0c17',
              id: 6717,
              email,
              isAdmin: false,
            },
          }),
        }),
      });
      expect(applyPointOffersByEmail).toBeCalledTimes(1);

      const offerEmail = applyPointOffersByEmail.mock.calls[0][0];
      const offerList = applyPointOffersByEmail.mock.calls[0][1];

      expect(offerEmail).toBe(email);
      expect(offerList).toStrictEqual([PointOfferName.pearl]);
    });
  });

  it('should ignore other PEARL events', async () => {
    const email = 'alexey.b+1@bilberrry.com';
    await service.handlePearlMessage({
      Body: JSON.stringify({
        Message: JSON.stringify({
          objectName: '/eventUser',
          action: 'POST',
          user: {
            username: 'dbisso_41188b49-a5e4-49d8-9e2d-f86610ba0c17',
            id: 6717,
            email,
            isAdmin: false,
          },
        }),
      }),
    });
    expect(applyPointOffersByEmail).toBeCalledTimes(0);
  });
});
