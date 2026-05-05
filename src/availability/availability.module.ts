import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { NearbyService } from './nearby/nearby.service';
import { DistributionCenter } from '../distribution-center/entities/distribution-center.entity';
import { Inventory } from '../inventory/entities/inventory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DistributionCenter, Inventory])],
  providers: [AvailabilityService, NearbyService],
  controllers: [AvailabilityController],
  exports: [NearbyService],
})
export class AvailabilityModule {}
