import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('CategoryService', () => {
  let service: CategoryService;

  let prisma: {
    category: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const category = {
    id: 'category-1',
    name: 'Electronics',
    description: 'Electronic products',
    slug: 'electronics',
    imageUrl: 'https://example.com/electronics.jpg',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    _count: { products: 3 },
  };

  beforeEach(async () => {
    prisma = {
      category: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a category with a slug generated from its name', async () => {
      const createdCategory = {
        ...category,
        slug: 'home-electronics',
      };

      prisma.category.create.mockResolvedValue(createdCategory);

      const result = await service.create({
        name: 'Home Electronics',
        description: 'Electronic products',
      } as any);

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Home Electronics',
          slug: 'home-electronics',
          description: 'Electronic products',
        },
      });
      expect(result.slug).toBe('home-electronics');
      expect(result.productCount).toBe(0);
    });

    it('uses the provided slug instead of generating one', async () => {
      prisma.category.create.mockResolvedValue({
        ...category,
        slug: 'consumer-tech',
      });

      const result = await service.create({
        name: 'Electronics',
        slug: 'consumer-tech',
      } as any);

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Electronics',
          slug: 'consumer-tech',
        },
      });
      expect(result.slug).toBe('consumer-tech');
    });
  });

  describe('findAll', () => {
    it('returns categories with pagination metadata and product counts', async () => {
      prisma.category.count.mockResolvedValue(21);
      prisma.category.findMany.mockResolvedValue([category]);

      const result = await service.findAll({
        page: 2,
        limit: 10,
      } as any);

      expect(prisma.category.count).toHaveBeenCalledWith({ where: {} });
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { products: true } } },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].productCount).toBe(3);
      expect(result.meta).toEqual({
        total: 21,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('filters by active status and search term', async () => {
      prisma.category.count.mockResolvedValue(1);
      prisma.category.findMany.mockResolvedValue([category]);

      await service.findAll({
        isActive: true,
        search: 'electro',
      } as any);

      const expectedWhere = {
        isActive: true,
        OR: [
          { name: { contains: 'electro', mode: 'insensitive' } },
          {
            description: {
              contains: 'electro',
              mode: 'insensitive',
            },
          },
        ],
      };

      expect(prisma.category.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('returns zero total pages when no categories exist', async () => {
      prisma.category.count.mockResolvedValue(0);
      prisma.category.findMany.mockResolvedValue([]);

      const result = await service.findAll({} as any);

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
    });

    it('defaults missing product counts to zero', async () => {
      const categoryWithoutCount = { ...category };
      delete (categoryWithoutCount as any)._count;

      prisma.category.count.mockResolvedValue(1);
      prisma.category.findMany.mockResolvedValue([categoryWithoutCount]);

      const result = await service.findAll({} as any);

      expect(result.data[0].productCount).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns a category by ID with its product count', async () => {
      prisma.category.findUnique.mockResolvedValue(category);

      const result = await service.findOne('category-1');

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        include: { _count: { select: { products: true } } },
      });
      expect(result.id).toBe('category-1');
      expect(result.productCount).toBe(3);
    });

    it('throws NotFoundException when the category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('returns a category by slug', async () => {
      prisma.category.findUnique.mockResolvedValue(category);

      const result = await service.findBySlug('electronics');

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { slug: 'electronics' },
        include: { _count: { select: { products: true } } },
      });
      expect(result.slug).toBe('electronics');
    });

    it('throws NotFoundException when the slug does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates an existing category', async () => {
      prisma.category.findUnique.mockResolvedValue(category);
      prisma.category.update.mockResolvedValue({
        ...category,
        name: 'Updated Electronics',
        _count: { products: 4 },
      });

      const result = await service.update('category-1', {
        name: 'Updated Electronics',
      } as any);

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        data: { name: 'Updated Electronics' },
        include: { _count: { select: { products: true } } },
      });
      expect(result.name).toBe('Updated Electronics');
      expect(result.productCount).toBe(4);
    });

    it('throws NotFoundException when updating a missing category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'Updated' } as any),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('rejects a slug already used by another category', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce({ ...category, id: 'category-2' });

      await expect(
        service.update('category-1', { slug: 'another-slug' } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('does not check for duplicate slugs when the slug is unchanged', async () => {
      prisma.category.findUnique.mockResolvedValue(category);
      prisma.category.update.mockResolvedValue(category);

      await service.update('category-1', { slug: 'electronics' } as any);

      expect(prisma.category.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.category.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes a category without associated products', async () => {
      prisma.category.findUnique.mockResolvedValue({
        ...category,
        _count: { products: 0 },
      });
      prisma.category.delete.mockResolvedValue(category);

      await expect(service.delete('category-1')).resolves.toEqual({
        message: 'Category deleted successfully.',
      });

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'category-1' },
      });
    });

    it('throws NotFoundException when deleting a missing category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('prevents deleting a category that still has products', async () => {
      prisma.category.findUnique.mockResolvedValue(category);

      await expect(service.delete('category-1')).rejects.toThrow(
        'Cannot delete category with associated products.',
      );

      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
