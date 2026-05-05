import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { NearbyService } from '../availability/nearby/nearby.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { OrderStatus } from './enums/order-status.enum';
import { Item } from '../item/entities/item.entity';

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly nearbyService: NearbyService,
  ) {}

  async createOrder(dto: CreateOrderDto, retries = 3): Promise<Order> {
    const nearbyDcIds = await this.nearbyService.findNearbyDcIds(dto.lat, dto.long);
    if (!nearbyDcIds.length) {
      throw new BadRequestException('No distribution centers nearby');
    }

    try {
      return await this.executeOrderTransaction(dto, nearbyDcIds);
    } catch (error: any) {
      if (error.code === '40001' && retries > 0) {
        // Retry on serialization failure
        return this.createOrder(dto, retries - 1);
      }
      throw error;
    }
  }

  private async executeOrderTransaction(dto: CreateOrderDto, nearbyDcIds: string[]): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const order = new Order();
      order.customerLatitude = dto.lat;
      order.customerLongitude = dto.long;
      order.status = OrderStatus.PENDING;
      order.totalAmountInPaise = 0;
      order.items = [];

      for (const itemDto of dto.items) {
        let fulfilled = false;
        
        const item = await queryRunner.manager.findOne(Item, { where: { id: itemDto.itemId }});
        if (!item) {
          throw new BadRequestException(`Item ${itemDto.itemId} not found`);
        }

        // Try to fulfill from the closest DC that has enough stock
        for (const dcId of nearbyDcIds) {
          // Find inventory record
          const inventory = await queryRunner.manager.findOne(Inventory, {
            where: {
              itemId: itemDto.itemId,
              distributionCenterId: dcId,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (inventory && inventory.availableCount >= itemDto.quantity) {
            // Found a DC with enough stock!
            inventory.availableCount -= itemDto.quantity;
            inventory.lockedCount += itemDto.quantity;

            await queryRunner.manager.save(inventory);

            const orderItem = new OrderItem();
            orderItem.itemId = itemDto.itemId;
            orderItem.fulfilledById = dcId;
            orderItem.quantity = itemDto.quantity;
            orderItem.unitPriceInPaise = item.priceInPaise;
            
            order.totalAmountInPaise += orderItem.unitPriceInPaise * orderItem.quantity;
            order.items.push(orderItem);

            fulfilled = true;
            break;
          }
        }

        if (!fulfilled) {
          throw new BadRequestException(`Item ${itemDto.itemId} is out of stock or unavailable nearby`);
        }
      }

      const savedOrder = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
