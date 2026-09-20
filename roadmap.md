# Local Delivery Service — Implementation Roadmap

> **Stack:** NestJS · PostgreSQL · Redis · TypeORM / Prisma
> **Purpose:** Build a real system, experience the tradeoffs first-hand, then articulate them in interviews.

Each phase produces working, runnable code. Tradeoffs are not discussed upfront — you will hit them naturally as you build and then decide.

---

## Phase 1 — Project Scaffold & Configuration ✅ `DONE`

**What you build:** A running NestJS monolith with environment-aware config, database connection, and health check.

### Steps
1. ✅ Bootstrap NestJS project (`nest new local-delivery-service`)
2. ✅ Set up `ConfigModule` with `.env` validation (use `@nestjs/config` + `joi`)
3. ✅ Integrate TypeORM
4. ✅ Connect to a local PostgreSQL instance via Docker Compose (port 5433 — system Postgres occupies 5432)
5. ✅ Add a `GET /health` endpoint that returns DB connectivity status
6. ✅ Set up a basic request logger middleware

### Decisions Made
- **TypeORM chosen** over Prisma. Will feel the migration tooling difference in Phase 2.
- **Monolith** — starting flat, pressure to split will come in Phase 4.
- **Port 5433 for Docker Postgres** — avoids conflict with system-level Postgres on 5432.

---

## Phase 2 — Core Domain: Entities & Migrations ✅ `DONE`

**What you build:** Database schema with migrations and typed TypeORM entities for all core domain objects.

### Steps
1. ✅ Create entities: `Item`, `Inventory`, `DistributionCenter`, `Order`, `OrderItem`
2. ✅ Write and run the initial migration (`InitialSchema1777953810754`)
3. ✅ Seed the database with sample data (10 DCs, 50 items, 500 inventory records, varied stock levels)
4. ✅ Expose basic CRUD for `Item` (`/admin/items`) and `DistributionCenter` (`/admin/distribution-centers`)
5. ✅ Write unit tests for service layer (10/10 passing)

### Decisions Made
- **`@faker-js/faker` pinned to v8** — v9+ is pure ESM, incompatible with ts-node CJS mode without extra config.
- **`TRUNCATE ... CASCADE`** for idempotent seeding — FK constraints prevent individual table truncation.
- **Global `ValidationPipe`** with `whitelist: true`, `forbidNonWhitelisted: true` — unknown fields in request bodies throw 400 instead of being silently dropped.
- **Price stored in paise (integer)** — avoids floating-point rounding errors in financial calculations.

---

## Phase 3 — Availability Service (Read Path) ✅ `DONE`

**What you build:** The `GET /v1/availability` endpoint — given a user location, return items available for delivery within 1 hour.

### Steps
1. Create `AvailabilityModule` with its own service and controller
2. Implement `GET /v1/availability?lat=&long=&page_size=&page_num=`
3. Build `NearbyService` — takes `(lat, long)`, returns DC IDs within range
   - Start with **Euclidean/Haversine distance** (pure SQL or in-memory calculation)
4. Query `Inventory` joined with `Item` for those DC IDs — sum `availableCount` across DCs per item
5. Return paginated list of `{ name, totalQuantity }`
6. Write integration tests using a test database

### Tradeoffs You'll Experience
- **Haversine in SQL vs application layer** — Doing math in SQL is efficient but hard to unit test. Doing it in the service layer is testable but slower for large DC counts.
- **Pagination: offset vs cursor** — Offset is easy; cursor is required if you sort by distance. You'll feel the difference when you add sorting.
- **N+1 query risk** — Naive join per DC will blow up. You'll learn to write a single aggregated query.

---

## Phase 4 — Order Service (Write Path & Consistency) ✅ `DONE`

**What you build:** `POST /v1/orders` — place a multi-item order atomically, preventing double-booking.

### Steps
1. Create `OrderModule` with its own service and controller
2. Implement `POST /v1/orders` accepting `{ lat, long, items: [{ itemId, quantity }] }`
3. Re-use `NearbyService` to resolve which DCs to fulfill from
4. Implement the order transaction:
   - `BEGIN` transaction with isolation level `SERIALIZABLE`
   - Check `availableCount >= requestedQuantity` for each item
   - Decrement `availableCount`, increment `lockedCount`
   - Insert `Order` + `OrderItems`
   - `COMMIT` or `ROLLBACK` on any failure
5. Return the created Order or a typed error (out of stock, DC unavailable, etc.)
6. Write concurrent load tests: simulate 2 users buying the last unit of the same item simultaneously

### Hard Problems You'll Hit
- **Serializable isolation and retry logic** — Postgres `SERIALIZABLE` can abort transactions due to conflicts. Your service must detect `40001` error codes and retry. You'll write this retry wrapper yourself.
- **Which DC to fulfill from** — If item A is at DC1 and DC2, which do you pick? You need a fulfillment selection strategy. Start with "pick closest DC", feel the edge cases.
- **Coupling** — Inventory and Order are in the same transaction. You'll feel why this makes splitting services hard later. This is intentional.

---

## Phase 5 — Read Scalability: DB Partitioning & Read Replicas

**What you build:** Replace the Redis caching idea with a scalable database architecture using Postgres Table Partitioning by region, paired with simulated Read Replicas to handle high read throughput.

### Steps
1. ✅ Add a `regionId` column to `DistributionCenter` (e.g., representing a zip code prefix) and seed it.
2. ✅ Convert the `Inventory` table to a Postgres LIST-partitioned table based on `regionId` (requires a data migration).
3. ✅ Update `NearbyService` to return `regionId`s alongside DC IDs, so queries can be targeted to specific partitions.
4. Set up a simulated Read Replica in NestJS (using TypeORM replication config) and route the `GET /v1/availability` endpoint to read from it.
5. Ensure the `POST /v1/orders` endpoint exclusively reads and writes to the primary (Leader) database to maintain strong consistency.
6. Run a local load test to benchmark partitioned read performance.

### Tradeoffs You'll Experience
- **Partition sizing** — Unevenly populated regions can lead to "hot" partitions, whereas a pure cache might distribute load differently.
- **Migration complexity** — Converting an existing table to a partitioned table in Postgres requires creating a new table and migrating data, unlike just spinning up a Redis instance.
- **Read replica lag** — By routing availability queries to a replica, you are explicitly accepting eventual consistency (slight staleness) on reads as an architectural policy, instead of dealing with cache invalidation logic.

---

## Phase 6 — Geo Deep Dive: Accurate Nearby DC Lookup

**What you build:** Replace the simple Haversine filter with a production-grade geo lookup that accounts for real travel time.

### Steps
1. Add PostGIS extension to Postgres; migrate `lat/long` columns to `GEOGRAPHY(POINT)` type
2. Use PostGIS `ST_DWithin` for fast bounding-box pre-filtering (e.g., ~60 km radius)
3. Integrate a Travel Time Estimation API (mock it with a stub service for now)
   - Input: list of DC coordinates + user location
   - Output: estimated travel time per DC
4. Filter the PostGIS results to only DCs where travel time ≤ 60 minutes
5. Benchmark: compare Haversine-only vs PostGIS+travel-time latency on 10k DCs

### Tradeoffs You'll Experience
- **PostGIS vs Redis Geo** — PostGIS is powerful and SQL-native; Redis GEORADIUS is faster for pure proximity queries but lacks rich filtering. You'll see why they serve different use cases.
- **External API latency** — Calling a Travel Time API adds ~50–200ms. You'll need to decide: call it per request, batch it, or pre-compute and cache DC travel times on a schedule.
- **Pre-computation trade-off** — You could run a nightly job to pre-compute "DCs reachable from each zip code prefix" and cache it. Fast, but stale during traffic events. You'll design this.

---

## Phase 7 — Real-Time Delivery Tracking

**What you build:** A WebSocket gateway that streams the delivery person's location to the customer.

### Steps
1. Add `@nestjs/websockets` with Socket.io adapter
2. Create a `TrackingGateway` with events: `subscribe-to-order`, `location-update`, `delivery-complete`
3. Simulate a delivery driver emitting location updates every 5 seconds
4. Customer subscribes by `orderId` and receives live position updates
5. On `delivery-complete`, close the subscription and update the order status

### Tradeoffs You'll Experience
- **WebSocket vs SSE** — WebSocket is bidirectional (overkill for one-way location updates); SSE is simpler for push-only. You'll feel the difference and decide.
- **Scaling WebSockets** — A single NestJS instance can't share socket state. If you add a second instance, subscriptions break. You'll hit this when you try to scale in Phase 8.
- **Redis Pub/Sub as the backbone** — The standard fix: driver service publishes location events to Redis; all gateway instances subscribe and forward to the right socket. You'll implement this.

---

## Phase 8 — Horizontal Scaling & Observability

**What you build:** Make the system handle multiple NestJS instances and add the observability needed to reason about it.

### Steps
1. Containerise the app with a `Dockerfile`; add a second NestJS instance in Docker Compose
2. Put Nginx in front as a load balancer
3. Fix WebSocket fan-out using Redis Pub/Sub (from Phase 7 decision)
4. Add structured logging (Pino via `nestjs-pino`) with `traceId` propagation
5. Add Prometheus metrics endpoint (`@willsoto/nestjs-prometheus`)
6. Build a minimal Grafana dashboard: RPS, p95 latency, cache hit rate, order success rate
7. Run a load test and use the dashboard to find your bottleneck

### What This Phase Teaches
- Where your single Postgres leader becomes the bottleneck
- How to reason about read replica lag in a live system
- The difference between throughput and latency under load

---

## Progression Summary

```
Phase 1 → Running app, config, DB connected
Phase 2 → Domain schema, seed data
Phase 3 → Availability read path (naive geo)
Phase 4 → Order write path (strong consistency)  ← First major tradeoff gauntlet
Phase 5 → DB Partitioning & Read Replicas       ← Scaling relational DBs
Phase 6 → Production geo with PostGIS           ← Geo deep dive
Phase 7 → Real-time tracking via WebSockets     ← Stateful connection tradeoffs
Phase 8 → Horizontal scale + observability      ← Everything breaks, you fix it
```

> Each phase is a **vertical slice** — avoid jumping ahead. The tradeoffs in later phases only land if you felt the pain they're solving.
