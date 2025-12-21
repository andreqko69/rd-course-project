import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TodosService } from './todos.service';
import { RedisService } from './redis.service';
import { Todo } from './todo.entity';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

describe('TodosService', () => {
  let service: TodosService;
  let mockTodoRepository: jest.Mocked<Partial<Repository<Todo>>>;
  let mockRedisService: jest.Mocked<Partial<RedisService>>;

  beforeEach(async () => {
    mockTodoRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodosService,
        {
          provide: getRepositoryToken(Todo),
          useValue: mockTodoRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<TodosService>(TodosService);
  });

  describe('create', () => {
    it('creates a new todo in the database', async () => {
      const createTodoDto: CreateTodoDto = {
        title: 'Test todo',
        description: 'Test description',
      };

      const mockTodo: Todo = {
        id: '123',
        title: 'Test todo',
        description: 'Test description',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockTodoRepository.create as jest.Mock).mockReturnValue(mockTodo);
      (mockTodoRepository.save as jest.Mock).mockResolvedValue(mockTodo);

      const result = await service.create(createTodoDto);

      expect(mockTodoRepository.create).toHaveBeenCalledWith(createTodoDto);
      expect(mockTodoRepository.save).toHaveBeenCalledWith(mockTodo);
      expect(result).toEqual(mockTodo);
    });

    it('invalidates the todos cache after creating a todo', async () => {
      const createTodoDto: CreateTodoDto = {
        title: 'Test todo',
      };

      const mockTodo: Todo = {
        id: '123',
        title: 'Test todo',
        description: null as unknown as string,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockTodoRepository.create as jest.Mock).mockReturnValue(mockTodo);
      (mockTodoRepository.save as jest.Mock).mockResolvedValue(mockTodo);

      await service.create(createTodoDto);

      expect(mockRedisService.delete).toHaveBeenCalledWith('todos:all');
    });
  });

  describe('findAll', () => {
    const mockTodos: Todo[] = [
      {
        id: '1',
        title: 'Todo 1',
        description: 'Description 1',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: 'Todo 2',
        description: 'Description 2',
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    describe('when todos are cached', () => {
      it('returns todos from cache without querying database', async () => {
        (mockRedisService.get as jest.Mock).mockResolvedValue(mockTodos);

        const result = await service.findAll();

        expect(mockRedisService.get).toHaveBeenCalledWith('todos:all');
        expect(result).toEqual(mockTodos);
        expect(mockTodoRepository.find).not.toHaveBeenCalled();
      });
    });

    describe('when todos are not cached', () => {
      it('fetches todos from database and stores them in cache', async () => {
        (mockRedisService.get as jest.Mock).mockResolvedValue(null);
        (mockTodoRepository.find as jest.Mock).mockResolvedValue(mockTodos);

        const result = await service.findAll();

        expect(mockRedisService.get).toHaveBeenCalledWith('todos:all');
        expect(mockTodoRepository.find).toHaveBeenCalled();
        expect(mockRedisService.set).toHaveBeenCalledWith(
          'todos:all',
          mockTodos,
          60,
        );
        expect(result).toEqual(mockTodos);
      });

      it('orders todos by createdAt in descending order', async () => {
        (mockRedisService.get as jest.Mock).mockResolvedValue(null);
        (mockTodoRepository.find as jest.Mock).mockResolvedValue(mockTodos);

        await service.findAll();

        expect(mockTodoRepository.find).toHaveBeenCalledWith({
          order: { createdAt: 'DESC' },
        });
      });
    });
  });

  describe('findOne', () => {
    it('returns a todo by id', async () => {
      const mockTodo: Todo = {
        id: '123',
        title: 'Test todo',
        description: 'Test description',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockTodoRepository.findOne as jest.Mock).mockResolvedValue(mockTodo);

      const result = await service.findOne('123');

      expect(mockTodoRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(result).toEqual(mockTodo);
    });

    describe('when todo does not exist', () => {
      it('returns null', async () => {
        (mockTodoRepository.findOne as jest.Mock).mockResolvedValue(null);

        const result = await service.findOne('non-existent-id');

        expect(result).toBeNull();
      });
    });
  });

  describe('update', () => {
    const mockTodo: Todo = {
      id: '123',
      title: 'Updated todo',
      description: 'Updated description',
      completed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('updates a todo by id', async () => {
      const updateTodoDto: UpdateTodoDto = {
        title: 'Updated todo',
        completed: true,
      };

      (mockTodoRepository.update as jest.Mock).mockResolvedValue({
        affected: 1,
      });
      (mockTodoRepository.findOne as jest.Mock).mockResolvedValue(mockTodo);

      const result = await service.update('123', updateTodoDto);

      expect(mockTodoRepository.update).toHaveBeenCalledWith(
        '123',
        updateTodoDto,
      );
      expect(result).toEqual(mockTodo);
    });

    it('invalidates the todos cache after updating a todo', async () => {
      const updateTodoDto: UpdateTodoDto = {
        title: 'Updated todo',
      };

      (mockTodoRepository.update as jest.Mock).mockResolvedValue({
        affected: 1,
      });
      (mockTodoRepository.findOne as jest.Mock).mockResolvedValue(mockTodo);

      await service.update('123', updateTodoDto);

      expect(mockRedisService.delete).toHaveBeenCalledWith('todos:all');
    });

    describe('when updating completed status', () => {
      it('updates the completed field', async () => {
        const updateTodoDto: UpdateTodoDto = {
          completed: true,
        };

        (mockTodoRepository.update as jest.Mock).mockResolvedValue({
          affected: 1,
        });
        (mockTodoRepository.findOne as jest.Mock).mockResolvedValue(mockTodo);

        await service.update('123', updateTodoDto);

        expect(mockTodoRepository.update).toHaveBeenCalledWith(
          '123',
          updateTodoDto,
        );
      });
    });

    describe('when updating description', () => {
      it('updates the description field', async () => {
        const updateTodoDto: UpdateTodoDto = {
          description: 'New description',
        };

        (mockTodoRepository.update as jest.Mock).mockResolvedValue({
          affected: 1,
        });
        (mockTodoRepository.findOne as jest.Mock).mockResolvedValue(mockTodo);

        await service.update('123', updateTodoDto);

        expect(mockTodoRepository.update).toHaveBeenCalledWith(
          '123',
          updateTodoDto,
        );
      });
    });
  });

  describe('delete', () => {
    it('deletes a todo by id', async () => {
      (mockTodoRepository.delete as jest.Mock).mockResolvedValue({
        affected: 1,
      });

      await service.delete('123');

      expect(mockTodoRepository.delete).toHaveBeenCalledWith('123');
    });

    it('invalidates the todos cache after deleting a todo', async () => {
      (mockTodoRepository.delete as jest.Mock).mockResolvedValue({
        affected: 1,
      });

      await service.delete('123');

      expect(mockRedisService.delete).toHaveBeenCalledWith('todos:all');
    });

    describe('when todo does not exist', () => {
      it('still attempts to delete from database', async () => {
        (mockTodoRepository.delete as jest.Mock).mockResolvedValue({
          affected: 0,
        });

        await service.delete('non-existent-id');

        expect(mockTodoRepository.delete).toHaveBeenCalledWith(
          'non-existent-id',
        );
      });
    });
  });
});
