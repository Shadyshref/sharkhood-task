import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Restaurant, RestaurantSchema } from '../schema/schemas';

import { RestaurantsController } from './resturant.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Restaurant.name,
        schema: RestaurantSchema,
      },
    ]),
  ],

  controllers: [RestaurantsController],

  providers: [RestaurantsService],

  exports: [RestaurantsService],
})
export class RestaurantsModule {}
