import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  console.log('Starting Super Todo App...');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '***' : 'NOT SET'}`);
  console.log(`REDIS_URL: ${process.env.REDIS_URL ? '***' : 'NOT SET'}`);

  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;

  await app.listen(port);
  console.log(`✅ Application is running on http://localhost:${port}`);
}

void bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});
