import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DistributionCenterService } from './distribution-center.service';
import { DistributionCenter } from './entities/distribution-center.entity';

const mockDcRepository = () => ({
  find: jest.fn(),
  findOneBy: jest.fn(),
  findBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

type MockRepo<T extends object> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('DistributionCenterService', () => {
  let service: DistributionCenterService;
  let repo: MockRepo<DistributionCenter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributionCenterService,
        {
          provide: getRepositoryToken(DistributionCenter),
          useFactory: mockDcRepository,
        },
      ],
    }).compile();

    service = module.get<DistributionCenterService>(DistributionCenterService);
    repo = module.get(getRepositoryToken(DistributionCenter));
  });

  describe('findActive', () => {
    it('should return only active distribution centers', async () => {
      const activeDcs = [
        { id: 'dc-1', name: 'DC Koramangala', isActive: true },
        { id: 'dc-2', name: 'DC Whitefield', isActive: true },
      ] as DistributionCenter[];

      repo.findBy!.mockResolvedValue(activeDcs);

      const result = await service.findActive();

      expect(result).toHaveLength(2);
      expect(repo.findBy).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('findOne', () => {
    it('should return the DC when found', async () => {
      const dc = { id: 'dc-1', name: 'DC Koramangala' } as DistributionCenter;
      repo.findOneBy!.mockResolvedValue(dc);

      const result = await service.findOne('dc-1');
      expect(result).toEqual(dc);
    });

    it('should throw NotFoundException for unknown ID', async () => {
      repo.findOneBy!.mockResolvedValue(null);

      await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a DC with valid coordinates', async () => {
      const dto = {
        name: 'DC HSR Layout',
        address: '1st Sector, HSR Layout',
        latitude: 12.9116,
        longitude: 77.6389,
      };
      const dc = { id: 'dc-new', ...dto } as DistributionCenter;

      repo.create!.mockReturnValue(dc);
      repo.save!.mockResolvedValue(dc);

      const result = await service.create(dto);
      expect(result.latitude).toBe(12.9116);
      expect(result.longitude).toBe(77.6389);
    });
  });
});
