import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdatePointOfferInput {
  @Field()
  _id: string;

  @Field({ nullable: true, defaultValue: true })
  isActive?: boolean;

  @Field({ nullable: true })
  points?: number;
}
