# Super Todo App

A high-performance todo application built with NestJS, PostgreSQL, and Redis caching.

## Features

- **REST API** for managing todos with full CRUD operations
- **PostgreSQL** database for persistent storage
- **Redis caching** for improved performance (1-minute TTL)
- **Automatic cache invalidation** on data changes
- **Docker support** for containerized deployment
- **Environment-based configuration** for flexible deployment

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 12+
- Redis 6+

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/todos_db
REDIS_URL=redis://localhost:6379
PORT=3000
```

## Running the Application

### Development Mode
```bash
pnpm start:dev
```

### Production Mode
```bash
pnpm build
pnpm start:prod
```

## Docker

### Building the Docker Image

```bash
docker build -t super-todo:latest .
```

### Running with Docker

```bash
docker run -d \
  --name super-todo \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@postgres:5432/todos_db \
  -e REDIS_URL=redis://redis:6379 \
  super-todo:latest
```

## API Endpoints

### Get All Todos
**Endpoint:** `GET /todos`

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "completed": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

**Caching:** Results are cached in Redis for 1 minute.

---

### Create a Todo
**Endpoint:** `POST /todos`

**Request Body:**
```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "completed": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "completed": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Side Effects:** Cache is invalidated.

---

### Update a Todo
**Endpoint:** `PATCH /todos/:todoId`

**Request Body:**
```json
{
  "title": "Updated title",
  "completed": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Updated title",
  "description": "Milk, eggs, bread",
  "completed": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:45:00Z"
}
```

**Side Effects:** Cache is invalidated.

---

### Delete a Todo
**Endpoint:** `DELETE /todos/:todoId`

**Response:** 204 No Content

**Side Effects:** Cache is invalidated.

## Architecture

### Service Layer

**TodosService** - Handles all business logic:
- CRUD operations on todos
- Cache management
- Database interactions

**RedisService** - Manages Redis operations:
- Caching with TTL
- Cache invalidation
- Serialization/deserialization

### Database Schema

```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Cache Strategy

- **Cache Key:** `todos:all`
- **TTL:** 60 seconds
- **Invalidation Trigger:** Any create, update, or delete operation
- **Strategy:** Cache-aside pattern

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://localhost/todos_db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `PORT` | Server port | `3000` |

## Testing

Run tests:
```bash
pnpm test
```

Watch mode:
```bash
pnpm test:watch
```

Coverage:
```bash
pnpm test:cov
```

End-to-end tests:
```bash
pnpm test:e2e
```

## Development

### Format Code
```bash
pnpm format
```

### Lint Code
```bash
pnpm lint
```

## Performance Considerations

1. **Redis Caching:** GET /todos requests are cached for 1 minute, significantly reducing database load
2. **Automatic Invalidation:** Cache is cleared on any data modification to ensure data consistency
3. **Connection Pooling:** TypeORM handles database connection pooling automatically
4. **Lazy Loading:** Redis connections are established on module initialization

## Security Notes

- Use environment variables for sensitive configuration
- Never commit `.env` files to version control
- Ensure PostgreSQL and Redis are behind a firewall
- Consider using HTTPS in production
- Add authentication/authorization as needed

## License

UNLICENSED

## Support

For issues or questions, please refer to the project documentation or contact the development team.