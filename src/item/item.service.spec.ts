import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ItemService } from './item.service';
import { Item } from './entities/item.entity';

// Minimal mock factory — only the methods ItemService actually calls
const mockItemRepository = () => ({
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

type MockRepo<T extends object> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('ItemService', () => {
  let service: ItemService;
  let repo: MockRepo<Item>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemService,
        { provide: getRepositoryToken(Item), useFactory: mockItemRepository },
      ],
    }).compile();

    service = module.get<ItemService>(ItemService);
    repo = module.get(getRepositoryToken(Item));
  });

  describe('findOne', () => {
    it('should return an item when found', async () => {
      const item = { id: 'uuid-1', name: 'Milk' } as Item;
      repo.findOneBy!.mockResolvedValue(item);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(item);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' });
    });

    it('should throw NotFoundException when item does not exist', async () => {
      repo.findOneBy!.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and persist a new item', async () => {
      const dto = { name: 'Eggs', category: 'Dairy', priceInPaise: 1200 };
      const newItem = { id: 'uuid-2', ...dto } as Item;

      repo.create!.mockReturnValue(newItem);
      repo.save!.mockResolvedValue(newItem);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(newItem);
      expect(result).toEqual(newItem);
    });
  });

  describe('update', () => {
    it('should update an existing item', async () => {
      const existing = { id: 'uuid-3', name: 'Bread', priceInPaise: 500 } as Item;
      const updated = { ...existing, priceInPaise: 600 } as Item;

      repo.findOneBy!.mockResolvedValue(existing);
      repo.save!.mockResolvedValue(updated);

      const result = await service.update('uuid-3', { priceInPaise: 600 });

      expect(result.priceInPaise).toBe(600);
    });

    it('should throw NotFoundException when updating a non-existent item', async () => {
      repo.findOneBy!.mockResolvedValue(null);

      await expect(service.update('ghost-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an existing item', async () => {
      const item = { id: 'uuid-4', name: 'Butter' } as Item;
      repo.findOneBy!.mockResolvedValue(item);
      repo.remove!.mockResolvedValue(item);

      await service.remove('uuid-4');

      expect(repo.remove).toHaveBeenCalledWith(item);
    });
  });
});
