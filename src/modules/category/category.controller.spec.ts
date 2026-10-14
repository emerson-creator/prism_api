import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

describe('CategoryController', () => {
  let controller: CategoryController;

  let categoryService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findBySlug: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const category = {
    id: 'category-1',
    name: 'Electronics',
    slug: 'electronics',
    isActive: true,
    productCount: 3,
  };

  beforeEach(async () => {
    categoryService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        { provide: CategoryService, useValue: categoryService },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCategory', () => {
    it('passes the creation DTO to the service', async () => {
      const dto = { name: 'Electronics', slug: 'electronics' };
      categoryService.create.mockResolvedValue(category);

      await expect(controller.createCategory(dto as any)).resolves.toBe(
        category,
      );

      expect(categoryService.create).toHaveBeenCalledWith(dto);
    });

    it('propagates service errors', async () => {
      const error = new Error('Category creation failed');
      categoryService.create.mockRejectedValue(error);

      await expect(
        controller.createCategory({ name: 'Electronics' } as any),
      ).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    it('passes query filters and pagination to the service', async () => {
      const query = { page: 2, limit: 10, search: 'electro' };
      const result = {
        data: [category],
        meta: { total: 1, page: 2, limit: 10, totalPages: 1 },
      };
      categoryService.findAll.mockResolvedValue(result);

      await expect(controller.findAll(query as any)).resolves.toBe(result);

      expect(categoryService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findBySlug', () => {
    it('passes the slug to the service', async () => {
      categoryService.findBySlug.mockResolvedValue(category);

      await expect(
        controller.findBySlug('electronics'),
      ).resolves.toBe(category);

      expect(categoryService.findBySlug).toHaveBeenCalledWith('electronics');
    });

    it('propagates service errors', async () => {
      const error = new Error('Category not found');
      categoryService.findBySlug.mockRejectedValue(error);

      await expect(controller.findBySlug('missing')).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    it('passes the category ID to the service', async () => {
      categoryService.findOne.mockResolvedValue(category);

      await expect(controller.findOne('category-1')).resolves.toBe(category);

      expect(categoryService.findOne).toHaveBeenCalledWith('category-1');
    });
  });

  describe('updateCategory', () => {
    it('passes the category ID and update DTO to the service', async () => {
      const dto = { name: 'Updated Electronics' };
      categoryService.update.mockResolvedValue({
        ...category,
        ...dto,
      });

      const result = await controller.updateCategory(
        'category-1',
        dto as any,
      );

      expect(categoryService.update).toHaveBeenCalledWith('category-1', dto);
      expect(result.name).toBe('Updated Electronics');
    });

    it('propagates service errors', async () => {
      const error = new Error('Update failed');
      categoryService.update.mockRejectedValue(error);

      await expect(
        controller.updateCategory(
          'category-1',
          { name: 'Updated Electronics' } as any,
        ),
      ).rejects.toBe(error);
    });
  });

  describe('deleteCategory', () => {
    it('deletes the category and returns a success message', async () => {
      categoryService.delete.mockResolvedValue({
        message: 'Category deleted successfully.',
      });

      await expect(
        controller.deleteCategory('category-1'),
      ).resolves.toEqual({
        message: 'Category deleted successfully.',
      });

      expect(categoryService.delete).toHaveBeenCalledWith('category-1');
    });

    it('propagates service errors', async () => {
      const error = new Error('Cannot delete category');
      categoryService.delete.mockRejectedValue(error);

      await expect(
        controller.deleteCategory('category-1'),
      ).rejects.toBe(error);
    });
  });
});
