import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { TodosService } from './todos.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Todo } from './todo.entity';

@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  async findAll(): Promise<Todo[]> {
    return this.todosService.findAll();
  }

  @Post()
  async create(@Body() createTodoDto: CreateTodoDto): Promise<Todo> {
    return this.todosService.create(createTodoDto);
  }

  @Patch(':todoId')
  async update(
    @Param('todoId') todoId: string,
    @Body() updateTodoDto: UpdateTodoDto,
  ): Promise<Todo> {
    const todo = await this.todosService.update(todoId, updateTodoDto);
    if (!todo) {
      throw new NotFoundException(`Todo with id ${todoId} not found`);
    }
    return todo;
  }

  @Delete(':todoId')
  async delete(@Param('todoId') todoId: string): Promise<void> {
    const todo = await this.todosService.findOne(todoId);
    if (!todo) {
      throw new NotFoundException(`Todo with id ${todoId} not found`);
    }
    await this.todosService.delete(todoId);
  }
}
