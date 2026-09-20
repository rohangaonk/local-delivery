import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Inventory } from '../../inventory/entities/inventory.entity';

@Entity('distribution_centers')
export class DistributionCenter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  address: string;

  /**
   * Stored as plain floats for now.
   * Phase 6 will migrate these to a PostGIS GEOGRAPHY(POINT) column.
   * Deliberately keeping them simple to feel the pain of changing the schema later.
   */
  @Column('double precision')
  latitude: number;

  @Column('double precision')
  longitude: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 1 })
  regionId: number;

  @OneToMany(() => Inventory, (inventory) => inventory.distributionCenter)
  inventories: Inventory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
