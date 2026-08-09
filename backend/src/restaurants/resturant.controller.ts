import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { ErrorCode } from '../common/contracts';

@Controller('v1/restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get(':restaurantId')
  async findOne(@Param('restaurantId') restaurantId: string) {
    const restaurant = await this.restaurantsService.findById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: 'Restaurant not found',
      });
    }
    return restaurant;
  }
}
