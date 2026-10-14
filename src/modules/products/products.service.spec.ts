import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const category = {
    id: 'category-1',
    name: 'Electronics',
  };

  const product = {
    id: 'product-1',
    name: 'Keyboard',
    description: 'Mechanical keyboard',
    price: new Prisma.Decimal('49.99'),
    stock: 10,
    sku: 'KEY-001',
    imageUrl: null,
    categoryId: 'category-1',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    category,
    orderItems: [],
    cartItems: [],
  };

  let prisma: {
    product: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      product: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new ProductsService(prisma as any);
  });

  describe('create', () => {
    it('creates a product and converts its price to a number in the response', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue(product);

      const result = await service.create({
        name: 'Keyboard',
        description: 'Mechanical keyboard',
        price: 49.99,
        stock: 10,
        sku: 'KEY-001',
        categoryId: 'category-1',
      });

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { sku: 'KEY-001' },
      });
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Keyboard',
            sku: 'KEY-001',
            price: expect.any(Prisma.Decimal),
          }),
          include: { category: true },
        }),
      );
      expect(result.price).toBe(49.99);
      expect(result.category).toBe('Electronics');
    });

    it('rejects a duplicate SKU', async () => {
      prisma.product.findUnique.mockResolvedValue(product);

      await expect(
        service.create({
          name: 'Another keyboard',
          description: 'Another product',
          price: 39.99,
          stock: 2,
          sku: 'KEY-001',
          categoryId: 'category-1',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('applies filters, pagination, ordering and response mapping', async () => {
      prisma.product.findMany.mockResolvedValue([product]);
      prisma.product.count.mockResolvedValue(21);

      const result = await service.findAll({
        category: 'Electronics',
        isActive: true,
        search: 'keyboard',
        page: 2,
        limit: 10,
      });

      const expectedWhere = {
        category: { name: 'Electronics' },
        isActive: true,
        OR: [
          { name: { contains: 'keyboard', mode: 'insensitive' } },
          { description: { contains: 'keyboard', mode: 'insensitive' } },
        ],
      };

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      });
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].price).toBe(49.99);
      expect(result.meta).toEqual({
        totalItems: 21,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('uses default pagination and empty filters when no query is provided', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const result = await service.findAll({});

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      });
      expect(result.meta).toEqual({
        totalItems: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });
  });

  describe('findOne', () => {
    it('returns the requested product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);

      const result = await service.findOne('product-1');

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        include: { category: true },
      });
      expect(result).toMatchObject({
        id: 'product-1',
        name: 'Keyboard',
        price: 49.99,
        category: 'Electronics',
      });
    });

    it('throws when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'Updated keyboard' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('rejects a SKU already used by another product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.findFirst.mockResolvedValue({
        ...product,
        id: 'another-product',
      });

      await expect(
        service.update('product-1', { sku: 'OTHER-001' }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { sku: 'OTHER-001', NOT: { id: 'product-1' } },
      });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('updates product fields and converts a supplied price to Decimal', async () => {
      const updatedProduct = {
        ...product,
        name: 'Updated keyboard',
        price: new Prisma.Decimal('59.99'),
      };

      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.update.mockResolvedValue(updatedProduct);

      const result = await service.update('product-1', {
        name: 'Updated keyboard',
        price: 59.99,
      });

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-1' },
          data: expect.objectContaining({
            name: 'Updated keyboard',
            price: expect.any(Prisma.Decimal),
          }),
          include: { category: true },
        }),
      );
      expect(result.name).toBe('Updated keyboard');
      expect(result.price).toBe(59.99);
    });
  });

  describe('updateStock', () => {
    it('throws when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStock('missing-id', 5),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('rejects a stock adjustment that would make inventory negative', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stock: 3,
      });

      await expect(
        service.updateStock('product-1', -4),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('adds the quantity to existing stock and persists the resulting total', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stock: 10,
      });
      prisma.product.update.mockResolvedValue({
        ...product,
        stock: 15,
      });

      await service.updateStock('product-1', 5);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { stock: 15 },
        include: { category: true },
      });
    });
  });

  describe('remove', () => {
    it('throws when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('prevents deleting a product with remaining stock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stock: 1,
      });

      await expect(service.remove('product-1')).rejects.toThrow(
        ConflictException,
      );

      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('prevents deleting a product associated with order items', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stock: 0,
        orderItems: [{ id: 'order-item-1' }],
      });

      await expect(service.remove('product-1')).rejects.toThrow(
        ConflictException,
      );

      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('deletes a product with no remaining stock or order items', async () => {
      const productToDelete = {
        ...product,
        stock: 0,
        orderItems: [],
      };

      prisma.product.findUnique.mockResolvedValue(productToDelete);
      prisma.product.delete.mockResolvedValue(productToDelete);

      const result = await service.remove('product-1');

      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        include: { category: true },
      });
      expect(result.id).toBe('product-1');
      expect(result.price).toBe(49.99);
    });
  });
});
