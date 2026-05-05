import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { validationSchema } from './config/env.validation';
import { databaseConfig } from './config/database.config';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { HealthModule } from './health/health.module';
import { ItemModule } from './item/item.module';
import { DistributionCenterModule } from './distribution-center/distribution-center.module';

@Module({
  imports: [
    // --- Config ----------------------------------------------------------
    // isGlobal: true means we don't need to re-import ConfigModule elsewhere.
    // validationSchema runs at startup; the app will refuse to start if any
    // required env var is missing or malformed.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      validationSchema,
      validationOptions: {
        // Fail immediately on first bad variable rather than collecting all errors
        abortEarly: true,
      },
    }),

    // --- Database --------------------------------------------------------
    // TypeOrmModule.forRootAsync lets us read config after ConfigModule is
    // fully initialised, so all env vars are validated before we attempt
    // a DB connection.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions =>
        config.get<TypeOrmModuleOptions>('database')!,
    }),

    // --- Feature Modules -------------------------------------------------
    HealthModule,
    ItemModule,
    DistributionCenterModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the request logger to every route globally
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
