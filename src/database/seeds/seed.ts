import 'reflect-metadata';
import 'dotenv/config';

import { AppDataSource } from '../../../data-source';
import { DistributionCenter } from '../../distribution-center/entities/distribution-center.entity';
import { Item } from '../../item/entities/item.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { faker } from '@faker-js/faker';


// ── Seeding constants ──────────────────────────────────────────────────────────
const DC_COUNT = 10;
const ITEM_COUNT = 50;

// India-centric bounding box — DCs spread across a plausible Bengaluru metro region
const LAT_MIN = 12.8;
const LAT_MAX = 13.2;
const LNG_MIN = 77.4;
const LNG_MAX = 77.8;

const CATEGORIES = [
  'Groceries',
  'Dairy',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
  'Frozen Foods',
  'Bakery',
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function randomLat(): number {
  return parseFloat((Math.random() * (LAT_MAX - LAT_MIN) + LAT_MIN).toFixed(6));
}

function randomLng(): number {
  return parseFloat((Math.random() * (LNG_MAX - LNG_MIN) + LNG_MIN).toFixed(6));
}

function randomPrice(): number {
  // Prices between ₹10 and ₹500, stored in paise
  return Math.floor((Math.random() * 490 + 10) * 100);
}

function randomStock(): { available: number; locked: number } {
  const roll = Math.random();
  if (roll < 0.1) return { available: 0, locked: 0 }; // out of stock
  if (roll < 0.25) return { available: Math.floor(Math.random() * 5) + 1, locked: 0 }; // low stock
  return {
    available: Math.floor(Math.random() * 490) + 10,
    locked: Math.floor(Math.random() * 20),
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function seed() {
  await AppDataSource.initialize();
  console.log('✅ Connected to database');

  const dcRepo = AppDataSource.getRepository(DistributionCenter);
  const itemRepo = AppDataSource.getRepository(Item);
  const inventoryRepo = AppDataSource.getRepository(Inventory);

  // Idempotent — safe to run multiple times
  // CASCADE is needed because FK constraints prevent individual truncation
  await AppDataSource.query(
    'TRUNCATE TABLE inventories, order_items, orders, items, distribution_centers CASCADE',
  );
  console.log('🗑  Cleared existing data');

  // ── Distribution Centers ───────────────────────────────────────────────────
  const dcData = Array.from({ length: DC_COUNT }, (_, i) => ({
    name: `DC ${i + 1} — ${faker.location.city()}`,
    address: faker.location.streetAddress({ useFullAddress: true }),
    latitude: randomLat(),
    longitude: randomLng(),
    isActive: true,
  }));

  const dcs = await dcRepo.save(dcData);
  console.log(`✅ Seeded ${dcs.length} distribution centers`);

  // ── Items ──────────────────────────────────────────────────────────────────
  const itemData = Array.from({ length: ITEM_COUNT }, () => ({
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    category: faker.helpers.arrayElement(CATEGORIES),
    priceInPaise: randomPrice(),
    isActive: true,
  }));

  const items = await itemRepo.save(itemData);
  console.log(`✅ Seeded ${items.length} items`);

  // ── Inventory ──────────────────────────────────────────────────────────────
  // Full DC × Item matrix with varied stock levels to make Phase 3 interesting
  const inventoryData: Partial<Inventory>[] = [];
  for (const dc of dcs) {
    for (const item of items) {
      const { available, locked } = randomStock();
      inventoryData.push({
        itemId: item.id,
        distributionCenterId: dc.id,
        availableCount: available,
        lockedCount: locked,
      });
    }
  }

  // Batch inserts to avoid Postgres parameter limit (~65k)
  const CHUNK = 500;
  for (let i = 0; i < inventoryData.length; i += CHUNK) {
    await inventoryRepo.save(inventoryData.slice(i, i + CHUNK));
  }
  console.log(
    `✅ Seeded ${inventoryData.length} inventory records (${DC_COUNT} DCs × ${ITEM_COUNT} items)`,
  );

  await AppDataSource.destroy();
  console.log('🎉 Seeding complete');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
