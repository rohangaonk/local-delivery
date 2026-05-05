import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  /**
   * GET /health
   *
   * Returns overall system status and individual DB connectivity check.
   * A 200 means the service is up and connected to Postgres.
   * A 503 means at least one indicator failed — check the `details` field.
   */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Runs a simple `SELECT 1` against the default TypeORM connection
      () => this.db.pingCheck('database'),
    ]);
  }
}
