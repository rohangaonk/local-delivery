import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Item } from '../../item/entities/item.entity';
import { DistributionCenter } from '../../distribution-center/entities/distribution-center.entity';

/**
 * Inventory = physical stock of an Item at a specific DistributionCenter.
 *
 * Two count columns exist deliberately:
 *   - availableCount: stock available to be ordered right now
 *   - lockedCount:    stock reserved by in-flight orders (committed but not yet delivered)
 *
 * totalPhysicalStock = availableCount + lockedCount
 *
 * You need both to handle concurrent orders without double-booking.
 * Phase 4 will show you exactly why lockedCount matters.
 */
@Entity('inventories')
@Index(['item', 'distributionCenter'], { unique: true })
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Item, (item) => item.inventories, { nullable: false })
  item: Item;

  @Column()
  itemId: string;

  @ManyToOne(
    () => DistributionCenter,
    (dc) => dc.inventories,
    { nullable: false },
  )
  distributionCenter: DistributionCenter;

  @Column()
  distributionCenterId: string;

  @Column({ type: 'int', default: 1 })
  regionId: number;

  @Column({ type: 'int', default: 0 })
  availableCount: number;

  @Column({ type: 'int', default: 0 })
  lockedCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
