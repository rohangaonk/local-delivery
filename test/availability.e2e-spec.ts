import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Availability (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/availability', () => {
    it('should return availability for a valid location', async () => {
      // Using coordinates roughly in the center of the Bengaluru seed box
      const response = await request(app.getHttpServer())
        .get('/v1/availability')
        .query({
          lat: 13.0,
          long: 77.6,
          limit: 5,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);

      if (response.body.data.length > 0) {
        const item = response.body.data[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('totalQuantity');
        expect(typeof item.totalQuantity).toBe('number');
      }
    });

    it('should handle pagination via cursor', async () => {
      // Fetch first page
      const firstPage = await request(app.getHttpServer())
        .get('/v1/availability')
        .query({
          lat: 13.0,
          long: 77.6,
          limit: 2,
        })
        .expect(200);

      if (firstPage.body.meta.hasNextPage) {
        const cursor = firstPage.body.meta.nextCursor;
        expect(cursor).toBeDefined();

        // Fetch second page
        const secondPage = await request(app.getHttpServer())
          .get('/v1/availability')
          .query({
            lat: 13.0,
            long: 77.6,
            limit: 2,
            cursor,
          })
          .expect(200);

        expect(secondPage.body.data.length).toBeGreaterThan(0);
        expect(secondPage.body.data[0].id).not.toBe(firstPage.body.data[0].id);
      }
    });

    it('should return empty list for remote location', async () => {
      // Middle of the ocean
      const response = await request(app.getHttpServer())
        .get('/v1/availability')
        .query({
          lat: 0,
          long: 0,
        })
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta.hasNextPage).toBe(false);
    });

    it('should fail on invalid coordinates', async () => {
      await request(app.getHttpServer())
        .get('/v1/availability')
        .query({
          lat: 100, // Invalid lat
          long: 77.6,
        })
        .expect(400);
    });
  });
});
