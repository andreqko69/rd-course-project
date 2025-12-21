# Super Todo App - API Documentation

## Overview

This document describes the REST API for the Super Todo application. All endpoints return JSON responses and accept JSON request bodies.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, the API does not require authentication. For production use, consider implementing JWT or OAuth2 authentication.

## Response Format

All successful responses follow this format:

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string or null",
  "completed": "boolean",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}
```

## Error Handling

Errors are returned with appropriate HTTP status codes:

- `400 Bad Request` - Invalid request body or parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include a message:

```json
{
  "statusCode": 404,
  "message": "Todo with id <id> not found",
  "error": "Not Found"
}
```

## Endpoints

### 1. Get All Todos

Retrieve all todos from the database. Results are cached in Redis for 1 minute.

**Endpoint:** `GET /todos`

**Method:** GET

**Headers:**
```
Content-Type: application/json
```

**Query Parameters:** None

**Request Body:** None

**Response:** 200 OK

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "completed": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Finish project",
    "description": "Complete the todo app",
    "completed": true,
    "createdAt": "2024-01-14T09:15:00.000Z",
    "updatedAt": "2024-01-15T14:22:00.000Z"
  }
]
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/todos \
  -H "Content-Type: application/json"
```

**JavaScript Fetch Example:**
```javascript
const response = await fetch('http://localhost:3000/todos');
const todos = await response.json();
console.log(todos);
```

**Cache Behavior:**
- First request fetches from database and caches for 60 seconds
- Subsequent requests within 60 seconds serve from Redis cache
- Cache is invalidated when any todo is created, updated, or deleted

---

### 2. Create a Todo

Create a new todo item in the database.

**Endpoint:** `POST /todos`

**Method:** POST

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "completed": false
}
```

**Field Descriptions:**
- `title` (required, string): The title of the todo
- `description` (optional, string): Additional description
- `completed` (optional, boolean): Whether the todo is completed (default: false)

**Response:** 201 Created

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "completed": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Minimal Request Example:**
```json
{
  "title": "Simple todo"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Buy groceries",
    "description": "Milk, eggs, bread"
  }'
```

**JavaScript Fetch Example:**
```javascript
const response = await fetch('http://localhost:3000/todos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Buy groceries',
    description: 'Milk, eggs, bread'
  })
});
const newTodo = await response.json();
console.log(newTodo);
```

**Side Effects:**
- Cache is invalidated (todos:all key is deleted from Redis)

---

### 3. Update a Todo

Update an existing todo item. All fields are optional.

**Endpoint:** `PATCH /todos/:todoId`

**Method:** PATCH

**Headers:**
```
Content-Type: application/json
```

**URL Parameters:**
- `todoId` (required, UUID): The ID of the todo to update

**Request Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "completed": true
}
```

**Field Descriptions:**
- `title` (optional, string): Updated title
- `description` (optional, string): Updated description
- `completed` (optional, boolean): Updated completion status

**Response:** 200 OK

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Updated title",
  "description": "Updated description",
  "completed": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T14:22:00.000Z"
}
```

**Partial Update Example - Mark as Completed:**
```json
{
  "completed": true
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/todos/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "completed": true
  }'
```

**JavaScript Fetch Example:**
```javascript
const todoId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`http://localhost:3000/todos/${todoId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    completed: true
  })
});
const updatedTodo = await response.json();
console.log(updatedTodo);
```

**Error Responses:**
- `404 Not Found` - If todo with the given ID doesn't exist

**Side Effects:**
- Cache is invalidated (todos:all key is deleted from Redis)

---

### 4. Delete a Todo

Delete a todo item from the database.

**Endpoint:** `DELETE /todos/:todoId`

**Method:** DELETE

**Headers:**
```
Content-Type: application/json
```

**URL Parameters:**
- `todoId` (required, UUID): The ID of the todo to delete

**Request Body:** None

**Response:** 204 No Content

No response body is returned on successful deletion.

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/todos/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json"
```

**JavaScript Fetch Example:**
```javascript
const todoId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`http://localhost:3000/todos/${todoId}`, {
  method: 'DELETE'
});

if (response.ok) {
  console.log('Todo deleted successfully');
}
```

**Error Responses:**
- `404 Not Found` - If todo with the given ID doesn't exist

**Side Effects:**
- Cache is invalidated (todos:all key is deleted from Redis)

---

## Cache Strategy

### Cache Configuration

- **Cache Key:** `todos:all`
- **TTL (Time To Live):** 60 seconds
- **Cache Backend:** Redis

### Cache Invalidation Events

The cache is automatically invalidated (cleared) on the following operations:

1. **POST /todos** - Creating a new todo
2. **PATCH /todos/:todoId** - Updating an existing todo
3. **DELETE /todos/:todoId** - Deleting a todo

### Cache Behavior Example

```
1. User A requests GET /todos at 10:00:00
   → Fetches from database, stores in cache with 60s TTL

2. User B requests GET /todos at 10:00:30
   → Serves from Redis cache (no database query)

3. User C creates a new todo via POST /todos at 10:00:45
   → Cache is invalidated

4. User A requests GET /todos at 10:01:15
   → Cache is empty, fetches from database, stores new result in cache
```

---

## Environment Variables

The API is configured through environment variables:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost/todos_db` | `postgresql://user:pass@localhost:5432/todos_db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | `redis://localhost:6379` |
| `PORT` | Server port | `3000` | `8080` |

---

## Rate Limiting

Currently, the API does not implement rate limiting. For production deployments, consider implementing rate limiting using middleware.

---

## CORS

Currently, CORS is not configured. For frontend integration, consider enabling CORS with appropriate origin restrictions.

---

## Database Schema

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

---

## Performance Tips

1. **Batch Operations:** For creating multiple todos, consider making sequential requests rather than parallel ones to avoid cache race conditions.

2. **Cache Warming:** After server startup, the first GET request will be slow as it queries the database. Subsequent requests within 60 seconds will be fast.

3. **Connection Pooling:** TypeORM automatically manages database connection pooling.

4. **Redis Connection:** Redis connection is established on module initialization and reused for all operations.

---

## Troubleshooting

### Common Issues

**Q: Why is my update not appearing in GET /todos?**
A: If the cache was just created, wait up to 60 seconds for it to expire, or create/update/delete another todo to invalidate the cache.

**Q: Can I bypass the cache?**
A: Currently, there's no cache bypass option. For bypassing cache, you would need to:
- Manually invalidate the cache via Redis
- Restart the application
- Or wait for the 60-second TTL to expire

**Q: What happens if Redis is down?**
A: The application will attempt to connect on startup and log errors, but may fail gracefully depending on error handling configuration.

---

## Future Enhancements

- Add user authentication and per-user todo lists
- Implement pagination for GET /todos
- Add filtering and sorting options
- Add rate limiting
- Implement soft deletes (archive todos instead of hard delete)
- Add todo categories/tags
- Implement todo due dates and reminders