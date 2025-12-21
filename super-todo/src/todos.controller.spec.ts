import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';
import { Todo } from './todo.entity';

describe('TodosController', () => {
  let controller: TodosController;
  let mockTodosService: jest.Mocked<Partial<TodosService>>;

  const mockTodo: Todo = {
    id: '123',
    title: 'Test Todo',
    description: 'Test Description',
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockTodosService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodosController],
      providers: [
        {
          provide: TodosService,
          useValue: mockTodosService,
        },
      ],
    }).compile();

    controller = module.get<TodosController>(TodosController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all todos', async () => {
      const todos = [mockTodo];
      (mockTodosService.findAll as jest.Mock).mockResolvedValue(todos);

      const result = await controller.findAll();

      expect(mockTodosService.findAll).toHaveBeenCalled();
      expect(result).toEqual(todos);
    });

    it('returns an empty array when no todos exist', async () => {
      (mockTodosService.findAll as jest.Mock).mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates a new todo', async () => {
      const createTodoDto = {
        title: 'New Todo',
        description: 'New Description',
      };
      (mockTodosService.create as jest.Mock).mockResolvedValue(mockTodo);

      const result = await controller.create(createTodoDto);

      expect(mockTodosService.create).toHaveBeenCalledWith(createTodoDto);
      expect(result).toEqual(mockTodo);
    });

    describe('when creating with minimal data', () => {
      it('creates a todo with only a title', async () => {
        const createTodoDto = { title: 'Just a title' };
        (mockTodosService.create as jest.Mock).mockResolvedValue(mockTodo);

        const result = await controller.create(createTodoDto);

        expect(mockTodosService.create).toHaveBeenCalledWith(createTodoDto);
        expect(result).toEqual(mockTodo);
      });
    });

    describe('when creating with all fields', () => {
      it('creates a todo with title, description, and completed status', async () => {
        const createTodoDto = {
          title: 'Full Todo',
          description: 'With description',
          completed: true,
        };
        (mockTodosService.create as jest.Mock).mockResolvedValue(mockTodo);

        const result = await controller.create(createTodoDto);

        expect(mockTodosService.create).toHaveBeenCalledWith(createTodoDto);
        expect(result).toEqual(mockTodo);
      });
    });
  });

  describe('update', () => {
    it('updates a todo by id', async () => {
      const updateTodoDto = { title: 'Updated Title' };
      const updatedTodo = { ...mockTodo, ...updateTodoDto };
      (mockTodosService.update as jest.Mock).mockResolvedValue(updatedTodo);

      const result = await controller.update('123', updateTodoDto);

      expect(mockTodosService.update).toHaveBeenCalledWith(
        '123',
        updateTodoDto,
      );
      expect(result).toEqual(updatedTodo);
    });

    it('throws NotFoundException when todo does not exist', async () => {
      const updateTodoDto = { title: 'Updated Title' };
      (mockTodosService.update as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.update('non-existent', updateTodoDto),
      ).rejects.toThrow(NotFoundException);
    });

    describe('when updating the title', () => {
      it('updates the title field', async () => {
        const updateTodoDto = { title: 'New Title' };
        const updatedTodo = { ...mockTodo, ...updateTodoDto };
        (mockTodosService.update as jest.Mock).mockResolvedValue(updatedTodo);

        const result = await controller.update('123', updateTodoDto);

        expect(result.title).toBe('New Title');
      });
    });

    describe('when updating the completed status', () => {
      it('marks a todo as completed', async () => {
        const updateTodoDto = { completed: true };
        const updatedTodo = { ...mockTodo, ...updateTodoDto };
        (mockTodosService.update as jest.Mock).mockResolvedValue(updatedTodo);

        const result = await controller.update('123', updateTodoDto);

        expect(result.completed).toBe(true);
      });

      it('marks a todo as incomplete', async () => {
        const updateTodoDto = { completed: false };
        const updatedTodo = { ...mockTodo, completed: false };
        (mockTodosService.update as jest.Mock).mockResolvedValue(updatedTodo);

        const result = await controller.update('123', updateTodoDto);

        expect(result.completed).toBe(false);
      });
    });

    describe('when updating multiple fields', () => {
      it('updates title and completed status together', async () => {
        const updateTodoDto = { title: 'New Title', completed: true };
        const updatedTodo = { ...mockTodo, ...updateTodoDto };
        (mockTodosService.update as jest.Mock).mockResolvedValue(updatedTodo);

        const result = await controller.update('123', updateTodoDto);

        expect(result.title).toBe('New Title');
        expect(result.completed).toBe(true);
      });
    });
  });

  describe('delete', () => {
    it('deletes a todo by id', async () => {
      (mockTodosService.findOne as jest.Mock).mockResolvedValue(mockTodo);
      (mockTodosService.delete as jest.Mock).mockResolvedValue(undefined);

      await controller.delete('123');

      expect(mockTodosService.findOne).toHaveBeenCalledWith('123');
      expect(mockTodosService.delete).toHaveBeenCalledWith('123');
    });

    it('throws NotFoundException when todo does not exist', async () => {
      (mockTodosService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockTodosService.delete).not.toHaveBeenCalled();
    });

    describe('when deleting an existing todo', () => {
      it('calls the service delete method', async () => {
        (mockTodosService.findOne as jest.Mock).mockResolvedValue(mockTodo);
        (mockTodosService.delete as jest.Mock).mockResolvedValue(undefined);

        await controller.delete('123');

        expect(mockTodosService.delete).toHaveBeenCalledWith('123');
      });
    });

    describe('when deleting a non-existent todo', () => {
      it('throws an error without calling delete', async () => {
        (mockTodosService.findOne as jest.Mock).mockResolvedValue(null);
        (mockTodosService.delete as jest.Mock).mockResolvedValue(undefined);

        await expect(controller.delete('fake-id')).rejects.toThrow(
          NotFoundException,
        );
        expect(mockTodosService.delete).not.toHaveBeenCalled();
      });
    });
  });
});
