import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from './todo.entity';
import { RedisService } from './redis.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodosService {
  private readonly TODOS_CACHE_KEY = 'todos:all';
  private readonly CACHE_TTL = 60; // 1 minute

  constructor(
    @InjectRepository(Todo)
    private todosRepository: Repository<Todo>,
    private redisService: RedisService,
  ) {}

  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    const todo = this.todosRepository.create(createTodoDto);
    const savedTodo = await this.todosRepository.save(todo);
    await this.invalidateTodosCache();
    return savedTodo;
  }

  async findAll(): Promise<Todo[]> {
    // Try to get from cache first
    const cachedTodos = await this.redisService.get<Todo[]>(
      this.TODOS_CACHE_KEY,
    );
    if (cachedTodos) {
      return cachedTodos;
    }

    // If not in cache, fetch from database
    const todos = await this.todosRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Store in cache for 1 minute
    await this.redisService.set(this.TODOS_CACHE_KEY, todos, this.CACHE_TTL);

    return todos;
  }

  async findOne(id: string): Promise<Todo | null> {
    return this.todosRepository.findOne({ where: { id } });
  }

  async update(id: string, updateTodoDto: UpdateTodoDto): Promise<Todo | null> {
    await this.todosRepository.update(id, updateTodoDto);
    await this.invalidateTodosCache();
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    await this.todosRepository.delete(id);
    await this.invalidateTodosCache();
  }

  private async invalidateTodosCache(): Promise<void> {
    await this.redisService.delete(this.TODOS_CACHE_KEY);
  }
}
