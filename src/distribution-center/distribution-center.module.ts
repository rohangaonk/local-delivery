import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistributionCenter } from './entities/distribution-center.entity';
import { DistributionCenterService } from './distribution-center.service';
import { DistributionCenterController } from './distribution-center.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DistributionCenter])],
  controllers: [DistributionCenterController],
  providers: [DistributionCenterService],
  exports: [DistributionCenterService], // Phase 3 NearbyService needs this
})
export class DistributionCenterModule {}
