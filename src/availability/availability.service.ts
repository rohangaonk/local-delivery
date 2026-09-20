import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../inventory/entities/inventory.entity';
import { NearbyService } from './nearby/nearby.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import {
  AvailabilityResponseDto,
  AvailableItemDto,
} from './dto/availability-response.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly nearbyService: NearbyService,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
  ) {}

  async getAvailability(
    queryDto: AvailabilityQueryDto,
  ): Promise<AvailabilityResponseDto<AvailableItemDto>> {
    const { lat, long, limit, cursor } = queryDto;

    /**
     * Step 1: Find DCs within delivery range (default 10km).
     * This keeps our inventory search space small.
     */
    const nearbyDcs = await this.nearbyService.findNearbyDcIds(lat, long);

    if (nearbyDcs.length === 0) {
      return {
        data: [],
        meta: { nextCursor: null, hasNextPage: false },
      };
    }

    /**
     * Step 2: Query aggregated inventory across those DCs.
     * 
     * We use a single query with an IN clause to avoid N+1.
     * We join with Item to get metadata (name, price).
     * We use cursor-based pagination (item.id > :cursor) for stable results.
     * We include regionId in the WHERE clause so Postgres only scans 
     * the necessary partitions.
     */
    const dcIds = nearbyDcs.map((dc) => dc.id);
    const regionIds = [...new Set(nearbyDcs.map((dc) => dc.regionId))];

    const queryBuilder = this.inventoryRepository
      .createQueryBuilder('inventory')
      .innerJoin('inventory.item', 'item')
      .select('item.id', 'id')
      .addSelect('item.name', 'name')
      .addSelect('item.priceInPaise', 'priceInPaise')
      .addSelect('SUM(inventory.availableCount)', 'totalQuantity')
      .where('inventory.regionId IN (:...regionIds)', { regionIds })
      .andWhere('inventory.distributionCenterId IN (:...dcIds)', { dcIds })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .groupBy('item.id')
      .addGroupBy('item.name')
      .addGroupBy('item.priceInPaise')
      .orderBy('item.id', 'ASC')
      .limit(limit + 1); // Fetch one extra to check if there's a next page

    if (cursor) {
      queryBuilder.andWhere('item.id > :cursor', { cursor });
    }

    /**
     * We use getRawMany because SUM() is an aggregate function that 
     * TypeORM doesn't automatically map back to entity instances 
     * when using groupBy.
     */
    const rawResults = await queryBuilder.getRawMany();

    const hasNextPage = rawResults.length > limit;
    const items = rawResults.slice(0, limit);

    const data: AvailableItemDto[] = items.map((r) => ({
      id: r.id,
      name: r.name,
      priceInPaise: Number(r.priceInPaise),
      totalQuantity: Number(r.totalQuantity),
    }));

    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data,
      meta: {
        nextCursor,
        hasNextPage,
      },
    };
  }
}
