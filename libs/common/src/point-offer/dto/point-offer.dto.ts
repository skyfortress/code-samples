import { PointOfferName } from '@app/point-offer/types';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';

@ObjectType()
export class PointOfferDto {
  @Field(() => ID)
  _id: ObjectId;

  @Field(() => PointOfferName)
  systemName: PointOfferName;

  @Field()
  usedNumber: number;

  @Field()
  isActive: boolean;

  @Field()
  points: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
