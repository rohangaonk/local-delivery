import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Item } from '../../item/entities/item.entity';
import { DistributionCenter } from '../../distribution-center/entities/distribution-center.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { nullable: false })
  order: Order;

  @Column()
  orderId: string;

  @ManyToOne(() => Item, (item) => item.orderItems, { nullable: false })
  item: Item;

  @Column()
  itemId: string;

  /**
   * Which DC fulfilled this specific line item.
   * Recorded at order time — important for Phase 7 tracking and Phase 8 analytics.
   */
  @ManyToOne(() => DistributionCenter, { nullable: false })
  fulfilledBy: DistributionCenter;

  @Column()
  fulfilledById: string;

  @Column({ type: 'int' })
  quantity: number;

  /** Price snapshot — prevents order history breaking if item price changes later. */
  @Column({ type: 'int' })
  unitPriceInPaise: number;

  @CreateDateColumn()
  createdAt: Date;
}
