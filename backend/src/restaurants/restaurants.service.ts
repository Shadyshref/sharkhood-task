import { InjectModel } from '@nestjs/mongoose';
import { Restaurant, RestaurantDocument } from '../schema/schemas';
import { Model } from 'mongoose';
import { NormalizedRestaurant } from '../common/contracts';

export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
  ) {}

  async upsert(data: NormalizedRestaurant) {
    const update: Record<string, unknown> = {
      canonicalUrl: data.source.canonicalUrl,
      name: data.name,
      cuisines: data.cuisines,
      openingHours: data.openingHours,
      contact: data.contact,
      imageUrls: data.imageUrls,
      menuSections: data.menuSections,
      features: data.features,
      lastScrapeComplete: data.complete,
      adapterVersion: data.source.adapterVersion,
      lastScrapedAt: data.source.scrapedAt,
    };
    if (data.address !== undefined) {
      update.address = data.address;
    }

    if (data.location !== undefined) {
      update.location = data.location;
    }

    if (data.rating !== undefined) {
      update.rating = data.rating;
    }

    if (data.priceRange !== undefined) {
      update.priceRange = data.priceRange;
    }

    if (data.contact !== undefined) {
      update.contact = data.contact;
    }

    if (data.description !== undefined) {
      update.description = data.description;
    }

    if (data.source.contentHash !== undefined) {
      update.contentHash = data.source.contentHash;
    }
    return this.restaurantModel.findOneAndUpdate(
      {
        platform: data.source.platform,
        externalId: data.source.externalId,
      },
      {
        $set: update,
        $setOnInsert: {
          platform: data.source.platform,
          externalId: data.source.externalId,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );
  }
  async findById(id: string) {
    return this.restaurantModel.findById(id).lean();
  }
}
