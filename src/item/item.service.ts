import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './entities/item.entity';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';

@Injectable()
export class ItemService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
  ) {}

  findAll(): Promise<Item[]> {
    return this.itemRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.itemRepo.findOneBy({ id });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }

  create(dto: CreateItemDto): Promise<Item> {
    const item = this.itemRepo.create(dto);
    return this.itemRepo.save(item);
  }

  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.itemRepo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.itemRepo.remove(item);
  }
}
