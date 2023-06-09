import { registerEnumType } from '@nestjs/graphql';

export const PEARL_EVENTS_QUEUE_KEY = 'pearl_events_queue';

export enum PointOfferName {
  'pearl' = 'pearl',
}

registerEnumType(PointOfferName, { name: 'PointOfferName' });
