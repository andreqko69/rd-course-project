# Setup Guide - Super Todo App

## Local Development Setup

### Option 1: Using Docker (Recommended)

Docker is the easiest way to get PostgreSQL and Redis running without installing them locally.

#### Prerequisites
- Docker installed and running
- Docker Desktop (macOS/Windows) or Docker Engine (Linux)

#### Step 1: Start PostgreSQL Container

```bash
docker run -d \
  --name super-todo-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=todos_db \
  -p 5432:5432 \
  postgres:15-alpine
```

Verify PostgreSQL is running:
```bash
docker logs super-todo-postgres
```

#### Step 2: Start Redis Container

```bash
docker run -d \
  --name super-todo-redis \
  -p 6379:6379 \
  redis:7-alpine
```

Verify Redis is running:
```bash
docker logs super-todo-redis
```

#### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Update `.env` with these values:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/todos_db
REDIS_URL=redis://localhost:6379
PORT=3000
```

#### Step 4: Install and Run the Application

```bash
# Install dependencies
pnpm install

# Start the application in development mode
pnpm start:dev
```

The API will be available at `http://localhost:3000`

#### Step 5: Verify Everything Works

```bash
# Test the API
curl http://localhost:3000/todos

# Create a todo
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Todo",
    "description": "Testing the setup"
  }'
```

#### Cleaning Up Docker Containers

When you're done developing:

```bash
# Stop containers
docker stop super-todo-postgres super-todo-redis

# Remove containers
docker rm super-todo-postgres super-todo-redis

# Or remove everything including volumes
docker stop super-todo-postgres super-todo-redis
docker rm super-todo-postgres super-todo-redis
docker volume rm $(docker volume ls -q | grep super-todo)
```

---

### Option 2: Using Local PostgreSQL and Redis

If you prefer to install PostgreSQL and Redis locally:

#### macOS with Homebrew

##### Install PostgreSQL

```bash
brew install postgresql@15
brew services start postgresql@15
```

Create the database:
```bash
createdb todos_db
```

##### Install Redis

```bash
brew install redis
brew services start redis
```

##### Configure Environment Variables

Create `.env`:

```env
DATABASE_URL=postgresql://localhost/todos_db
REDIS_URL=redis://localhost:6379
PORT=3000
```

##### Run the Application

```bash
pnpm install
pnpm start:dev
```

#### Linux (Ubuntu/Debian)

##### Install PostgreSQL

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb todos_db
```

##### Install Redis

```bash
sudo apt-get install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

##### Configure Environment Variables

```env
DATABASE_URL=postgresql://postgres@localhost/todos_db
REDIS_URL=redis://localhost:6379
PORT=3000
```

##### Run the Application

```bash
pnpm install
pnpm start:dev
```

#### Windows

##### Install PostgreSQL

1. Download from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the prompts
3. Remember the password you set for the postgres user
4. During installation, note the port (default: 5432)

Create the database:
```bash
psql -U postgres -c "CREATE DATABASE todos_db;"
```

##### Install Redis

1. Download from: https://github.com/microsoftarchive/redis/releases
2. Or use Windows Subsystem for Linux (WSL) with: `wsl apt-get install redis-server`

##### Configure Environment Variables

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/todos_db
REDIS_URL=redis://localhost:6379
PORT=3000
```

##### Run the Application

```bash
pnpm install
pnpm start:dev
```

---

## Application Architecture

### Database Setup (TypeORM)

The application uses TypeORM with PostgreSQL. The schema is automatically created on startup due to `synchronize: true` in `app.module.ts`.

**Database Tables:**
- `todos` - Stores all todo items

**Columns:**
- `id` (UUID) - Primary key
- `title` (VARCHAR) - Todo title
- `description` (TEXT) - Optional description
- `completed` (BOOLEAN) - Completion status
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

### Cache Setup (Redis)

Redis is used to cache the results of `GET /todos` for 1 minute to improve performance.

**Cache Key:** `todos:all`
**TTL:** 60 seconds

Cache is invalidated automatically when:
- A new todo is created (POST)
- An existing todo is updated (PATCH)
- A todo is deleted (DELETE)

---

## Verifying the Setup

### Check PostgreSQL Connection

```bash
# Using psql (if PostgreSQL is local)
psql -U postgres -d todos_db -c "SELECT 1;"

# Or from the container
docker exec super-todo-postgres psql -U postgres -d todos_db -c "SELECT 1;"
```

### Check Redis Connection

```bash
# Using redis-cli (if Redis is local)
redis-cli ping

# Or from the container
docker exec super-todo-redis redis-cli ping
```

### Check Application Health

```bash
# Should return an empty array
curl http://localhost:3000/todos

# Should return 200 status code
curl -i http://localhost:3000/todos
```

---

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:cov

# Run end-to-end tests
pnpm test:e2e
```

---

## Environment Variables Reference

Create a `.env` file with these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/todos_db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `PORT` | Server port | `3000` |

### .env.example Template

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/todos_db

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=3000
NODE_ENV=development
```

---

## Building and Running in Production

### Build the Application

```bash
pnpm build
```

This creates optimized production code in the `dist/` directory.

### Run Production Build

```bash
pnpm start:prod
```

### Build Docker Image

```bash
docker build -t super-todo:latest .
```

### Run Docker Container

```bash
docker run -d \
  --name super-todo-app \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://postgres:password@postgres-host:5432/todos_db \
  -e REDIS_URL=redis://redis-host:6379 \
  super-todo:latest
```

---

## Troubleshooting

### Issue: "Cannot connect to PostgreSQL"

**Solutions:**
1. Verify PostgreSQL is running: `docker ps` or `brew services list`
2. Check DATABASE_URL in .env is correct
3. Verify database exists: `createdb todos_db` or `docker exec super-todo-postgres createdb -U postgres todos_db`
4. Test connection: `psql postgresql://postgres:password@localhost:5432/todos_db`

### Issue: "Cannot connect to Redis"

**Solutions:**
1. Verify Redis is running: `redis-cli ping` or `docker ps`
2. Check REDIS_URL in .env is correct
3. If using Docker: `docker logs super-todo-redis`
4. Verify Redis port is not in use: `lsof -i :6379`

### Issue: "Port 3000 already in use"

**Solutions:**
1. Change PORT in .env to an available port (e.g., 3001)
2. Or kill the process using port 3000: `lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9`

### Issue: "Module not found errors"

**Solutions:**
1. Delete node_modules and reinstall: `rm -rf node_modules && pnpm install`
2. Clear pnpm cache: `pnpm store prune`
3. Ensure you're using Node.js 18+: `node --version`

### Issue: "Database tables not created"

**Solutions:**
1. TypeORM should auto-create tables. Check app.module.ts has `synchronize: true`
2. Check application logs for TypeORM errors
3. Manually check tables: `docker exec super-todo-postgres psql -U postgres -d todos_db -c "\dt"`

### Issue: "Tests failing due to connection errors"

**Solutions:**
1. Ensure PostgreSQL and Redis are running before running tests
2. Check environment variables in test environment
3. Run tests with: `pnpm test` (uses test database configuration)

---

## Development Workflow

### 1. Start Services

```bash
# If using Docker
docker start super-todo-postgres super-todo-redis

# Or if using Homebrew on macOS
brew services start postgresql@15 redis
```

### 2. Run Development Server

```bash
pnpm start:dev
```

### 3. Run Tests in Watch Mode

```bash
pnpm test:watch
```

### 4. Make Changes

Edit files in `src/` directory. Changes are automatically reloaded due to `--watch` flag.

### 5. Format and Lint Code

```bash
pnpm format
pnpm lint
```

### 6. Stop Services

```bash
# If using Docker
docker stop super-todo-postgres super-todo-redis

# Or if using Homebrew on macOS
brew services stop postgresql@15 redis
```

---

## Quick Commands Reference

```bash
# Start development
pnpm start:dev

# Build application
pnpm build

# Run production build
pnpm start:prod

# Run tests
pnpm test
pnpm test:watch
pnpm test:cov

# Format and lint code
pnpm format
pnpm lint

# Build Docker image
docker build -t super-todo:latest .

# Run Docker container
docker run -d -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  super-todo:latest

# View Docker logs
docker logs super-todo-app

# Stop Docker container
docker stop super-todo-app

# Clean up Docker containers
docker rm super-todo-postgres super-todo-redis super-todo-app
```

---

## Next Steps

1. Start the development server
2. Test the API endpoints using cURL or Postman
3. Read the [API Documentation](./API.md)
4. Review the test files to understand the code structure
5. Deploy to production using the Dockerfile

For detailed API information, see [API.md](./API.md)
For project overview, see [README.md](./README.md)