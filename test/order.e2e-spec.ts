import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Item } from '../src/item/entities/item.entity';
import { Inventory } from '../src/inventory/entities/inventory.entity';
import { DistributionCenter } from '../src/distribution-center/entities/distribution-center.entity';

describe('Order (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/orders', () => {
    it('should handle concurrent orders atomically, preventing double booking', async () => {
      // 1. Find a DC and an Item
      const dc = await dataSource.manager.findOne(DistributionCenter, { where: { isActive: true } });
      const item = await dataSource.manager.findOne(Item, { where: { isActive: true } });
      
      expect(dc).toBeDefined();
      expect(item).toBeDefined();

      // Clear all existing inventory for this item
      await dataSource.manager.update(Inventory, { itemId: item!.id }, { availableCount: 0, lockedCount: 0 });

      // Setup inventory to exactly 1 for our target DC
      let inventory = await dataSource.manager.findOne(Inventory, {
        where: { itemId: item!.id, distributionCenterId: dc!.id }
      });
      
      if (!inventory) {
        inventory = new Inventory();
        inventory.itemId = item!.id;
        inventory.distributionCenterId = dc!.id;
      }
      
      inventory.availableCount = 1;
      inventory.lockedCount = 0;
      await dataSource.manager.save(inventory);

      // We'll place orders from coordinates exactly at the DC to guarantee it's chosen
      const orderPayload = {
        lat: dc!.latitude,
        long: dc!.longitude,
        items: [{ itemId: item!.id, quantity: 1 }]
      };

      // 2. Fire two orders simultaneously
      const req1 = request(app.getHttpServer()).post('/v1/orders').send(orderPayload);
      const req2 = request(app.getHttpServer()).post('/v1/orders').send(orderPayload);

      const [res1, res2] = await Promise.all([req1, req2]);

      // 3. One should succeed (201), one should fail (400)
      const statuses = [res1.status, res2.status].sort();
      
      // Expected: [201, 400]
      expect(statuses[0]).toBe(201); // Created
      expect(statuses[1]).toBe(400); // Bad Request (out of stock)

      // 4. Verify DB State
      const updatedInventory = await dataSource.manager.findOne(Inventory, {
        where: { id: inventory.id }
      });
      
      expect(updatedInventory!.availableCount).toBe(0);
      expect(updatedInventory!.lockedCount).toBe(1);
    });
  });
});
