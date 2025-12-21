import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from './todo.entity';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';
import { RedisService } from './redis.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl =
          configService.get<string>('DATABASE_URL') ||
          'postgresql://localhost/todos_db';

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          entities: [Todo],
          synchronize: true,
          logging: false,
        };
      },
    }),
    TypeOrmModule.forFeature([Todo]),
  ],
  controllers: [TodosController],
  providers: [TodosService, RedisService],
})
export class AppModule {}
