import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { OrderItem } from '../../order/entities/order-item.entity';

/**
 * Item = catalog entry (what a customer browses and orders).
 * Deliberately separate from Inventory (physical stock at a DC).
 *
 * Keep them separate — you will feel exactly why in Phase 3 when you
 * aggregate availableCount across multiple DCs per item.
 */
@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 50 })
  category: string;

  /** Price in smallest currency unit (paise / cents) to avoid float math. */
  @Column({ type: 'int', default: 0 })
  priceInPaise: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Inventory, (inventory) => inventory.item)
  inventories: Inventory[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.item)
  orderItems: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
