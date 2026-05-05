import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe — rejects any request body that fails DTO rules
  // whitelist: strips properties not declared in the DTO
  // forbidNonWhitelisted: throws on unknown properties instead of silently dropping them
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // auto-transform payloads to DTO class instances
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application running on http://localhost:${port}`);
}
bootstrap();
