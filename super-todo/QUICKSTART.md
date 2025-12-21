# Quick Start Guide

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 12+ running
- Redis 6+ running

## Setup

### 1. Install Dependencies

```bash
cd super-todo
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your database and Redis credentials:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/todos_db
REDIS_URL=redis://localhost:6379
PORT=3000
```

### 3. Start PostgreSQL and Redis

**PostgreSQL (macOS with Homebrew):**
```bash
brew services start postgresql
```

**Redis (macOS with Homebrew):**
```bash
brew services start redis
```

Or use Docker:
```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:13
docker run -d -p 6379:6379 redis:6
```

### 4. Create Database

```bash
createdb todos_db
```

Or if using PostgreSQL container:
```bash
docker exec <postgres-container-id> createdb -U postgres todos_db
```

### 5. Start the Application

**Development Mode (with hot reload):**
```bash
pnpm start:dev
```

**Production Mode:**
```bash
pnpm build
pnpm start:prod
```

The API will be available at `http://localhost:3000`

## Testing the API

### Create a Todo
```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn NestJS",
    "description": "Study NestJS fundamentals"
  }'
```

### Get All Todos
```bash
curl -X GET http://localhost:3000/todos
```

### Update a Todo (replace {id} with actual UUID)
```bash
curl -X PATCH http://localhost:3000/todos/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true
  }'
```

### Delete a Todo
```bash
curl -X DELETE http://localhost:3000/todos/{id}
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:cov
```

## Docker Deployment

### Build Docker Image
```bash
docker build -t super-todo:latest .
```

### Run with Docker Compose (optional)
```bash
docker run -d \
  --name super-todo \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@postgres:5432/todos_db \
  -e REDIS_URL=redis://redis:6379 \
  super-todo:latest
```

## Project Structure

```
src/
├── main.ts                    # App entry point
├── app.module.ts              # Root module with TypeORM config
├── todo.entity.ts             # Todo database entity
├── todos.service.ts           # Business logic
├── todos.controller.ts        # REST endpoints
├── redis.service.ts           # Redis cache wrapper
├── dto/
│   ├── create-todo.dto.ts     # Create request DTO
│   └── update-todo.dto.ts     # Update request DTO
├── todos.service.spec.ts      # Service tests
└── todos.controller.spec.ts   # Controller tests
```

## Key Features

✅ **4 REST Endpoints**
- GET /todos (cached for 1 minute)
- POST /todos
- PATCH /todos/:todoId
- DELETE /todos/:todoId

✅ **Redis Caching**
- GET /todos results cached for 60 seconds
- Automatic cache invalidation on create/update/delete

✅ **PostgreSQL**
- UUID primary keys
- Automatic timestamps (createdAt, updatedAt)
- TypeORM automatic migrations

✅ **Environment Configuration**
- DATABASE_URL for PostgreSQL
- REDIS_URL for Redis
- PORT for server port

✅ **Comprehensive Tests**
- Service tests with mocked dependencies
- Controller tests with validation
- Organized test structure with cascade blocks

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://localhost/todos_db | PostgreSQL connection |
| REDIS_URL | redis://localhost:6379 | Redis connection |
| PORT | 3000 | Server port |

## Troubleshooting

### PostgreSQL Connection Error
- Ensure PostgreSQL is running: `brew services list`
- Check DATABASE_URL is correct in .env
- Verify database exists: `psql -l`

### Redis Connection Error
- Ensure Redis is running: `redis-cli ping` (should return PONG)
- Check REDIS_URL is correct in .env

### Port Already in Use
- Change PORT in .env to an available port
- Or kill the process: `lsof -i :3000` then `kill -9 <PID>`

### Cache Not Invalidating
- Ensure Redis is connected: `redis-cli`
- Manually flush cache: `redis-cli FLUSHDB`

## Next Steps

1. Review the full [API Documentation](./API.md)
2. Read the [README](./README.md) for architecture details
3. Check out the test files for examples
4. Deploy to production using the Dockerfile

## Documentation

- [API Documentation](./API.md) - Complete API reference
- [README](./README.md) - Architecture and setup
- [Dockerfile](./Dockerfile) - Container configuration

## Support

For issues or questions, refer to the documentation files or check the NestJS documentation at https://docs.nestjs.com