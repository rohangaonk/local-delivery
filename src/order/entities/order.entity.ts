import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  /** Customer location captured at order time — used for DC selection in Phase 4. */
  @Column('double precision')
  customerLatitude: number;

  @Column('double precision')
  customerLongitude: number;

  /** Total in paise — computed from OrderItems at creation time. */
  @Column({ type: 'int', default: 0 })
  totalAmountInPaise: number;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
  })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
