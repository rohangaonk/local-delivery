import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributionCenter } from './entities/distribution-center.entity';
import {
  CreateDistributionCenterDto,
  UpdateDistributionCenterDto,
} from './dto/distribution-center.dto';

@Injectable()
export class DistributionCenterService {
  constructor(
    @InjectRepository(DistributionCenter)
    private readonly dcRepo: Repository<DistributionCenter>,
  ) {}

  findAll(): Promise<DistributionCenter[]> {
    return this.dcRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<DistributionCenter> {
    const dc = await this.dcRepo.findOneBy({ id });
    if (!dc) throw new NotFoundException(`DistributionCenter ${id} not found`);
    return dc;
  }

  /** Returns only active DCs — used by NearbyService in Phase 3. */
  findActive(): Promise<DistributionCenter[]> {
    return this.dcRepo.findBy({ isActive: true });
  }

  create(dto: CreateDistributionCenterDto): Promise<DistributionCenter> {
    const dc = this.dcRepo.create(dto);
    return this.dcRepo.save(dc);
  }

  async update(
    id: string,
    dto: UpdateDistributionCenterDto,
  ): Promise<DistributionCenter> {
    const dc = await this.findOne(id);
    Object.assign(dc, dto);
    return this.dcRepo.save(dc);
  }

  async remove(id: string): Promise<void> {
    const dc = await this.findOne(id);
    await this.dcRepo.remove(dc);
  }
}
