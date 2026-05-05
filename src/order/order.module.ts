import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { AvailabilityModule } from '../availability/availability.module';
import { Inventory } from '../inventory/entities/inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Inventory]),
    AvailabilityModule,
  ],
  controllers: [OrderController],
  providers: [OrderService]
})
export class OrderModule {}
