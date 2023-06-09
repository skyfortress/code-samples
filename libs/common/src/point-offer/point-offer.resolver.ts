import { InjectCurrentUser } from '@app/auth/current.user.decorator';
import { User } from '@app/auth/entities/user.schema';
import { PermissionGuard } from '@app/rbac/permission.guard';
import { PermissionsEnum } from '@app/rbac/types';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { PointOfferDto } from './dto/point-offer.dto';
import { UpdatePointOfferInput } from './dto/update.point-offer.input';
import { PointOfferService } from './point-offer.service';

@Resolver(() => PointOfferDto)
export class PointOfferResolver {
  constructor(private readonly pointOfferService: PointOfferService) {}

  @Query(() => [PointOfferDto])
  @UseGuards(PermissionGuard(PermissionsEnum.viewPointOffers))
  async pointOffers(): Promise<Partial<PointOfferDto>[]> {
    return this.pointOfferService.list();
  }

  @Mutation(() => PointOfferDto)
  @UseGuards(PermissionGuard(PermissionsEnum.updatePointOffers))
  async updatePointOffer(
    @InjectCurrentUser() user: User,
    @Args('data') dto: UpdatePointOfferInput,
  ): Promise<Partial<PointOfferDto>> {
    return this.pointOfferService.update(user, dto);
  }
}
