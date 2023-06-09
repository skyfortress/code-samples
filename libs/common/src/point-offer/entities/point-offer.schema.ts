import { PointOfferName } from '@app/point-offer/types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';

export type PointOffer = PointOfferClass & Document;

@Schema({
  collection: 'point-offers',
  timestamps: true,
})
export class PointOfferClass {
  @Prop()
  isActive: boolean;

  @Prop({ index: { unique: true }, type: String, enum: PointOfferName })
  systemName: PointOfferName;

  @Prop()
  points: number;

  @Prop({ default: 0 })
  usedNumber: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PointOfferToken = PointOfferClass.name;
export type PointOfferModel = Model<PointOffer>;
export const PointOfferSchema = SchemaFactory.createForClass(PointOfferClass);
