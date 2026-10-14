import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { generateOrderNumber } from 'src/common/utils/order-number';

jest.mock('src/common/utils/order-number', () => ({
  generateOrderNumber: jest.fn(),
}));

describe('OrdersService', () => {
  let service: OrdersService;

  let prisma: {
    $transaction: jest.Mock;
    order: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    product: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  let tx: {
    user: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock; update: jest.Mock };
    order: { create: jest.Mock; update: jest.Mock };
  };

  let mailService: {
    sendOrderShippedEmail: jest.Mock;
    sendOrderDeliveredEmail: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'customer@example.com',
    name: 'Alex',
    lastName: 'Smith',
  };

  const product = {
    id: 'product-1',
    name: 'Keyboard',
    price: new Prisma.Decimal('25.50'),
    stock: 10,
    isActive: true,
  };

  const makeOrder = (overrides: Record<string, any> = {}) => ({
    id: 'order-1',
    orderNumber: 'ORD-123',
    userId: 'user-1',
    status: OrderStatus.PENDING,
    total: new Prisma.Decimal('51.00'),
    shippingAddress: '123 Main Street',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    user,
    orderItems: [
      {
        id: 'item-1',
        productId: 'product-1',
        quantity: 2,
        price: new Prisma.Decimal('25.50'),
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        product,
      },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    tx = {
      user: { findUnique: jest.fn() },
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      order: {
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      user: { findUnique: jest.fn() },
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    mailService = {
      sendOrderShippedEmail: jest.fn().mockResolvedValue(undefined),
      sendOrderDeliveredEmail: jest.fn().mockResolvedValue(undefined),
    };

    (generateOrderNumber as jest.Mock).mockResolvedValue('ORD-123');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createForAdmin', () => {
    const dto = {
      userId: 'user-1',
      items: [{ productId: 'product-1', quantity: 2 }],
      shippingAddress: '123 Main Street',
    };

    it('creates an order using database prices and decrements stock', async () => {
      tx.user.findUnique.mockResolvedValue(user);
      tx.product.findUnique.mockResolvedValue(product);
      tx.product.update.mockResolvedValue({});
      tx.order.create.mockResolvedValue(makeOrder());

      const result = await service.createForAdmin(dto);

      expect(tx.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { stock: { decrement: 2 } },
      });
      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            total: 51,
            status: OrderStatus.PENDING,
            orderItems: {
              create: [
                {
                  productId: 'product-1',
                  quantity: 2,
                  price: product.price,
                },
              ],
            },
          }),
          include: expect.any(Object),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(51);
      expect(result.data.items[0].subtotal).toBe(51);
    });

    it('rejects when the user does not exist', async () => {
      tx.user.findUnique.mockResolvedValue(null);

      await expect(service.createForAdmin(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it('rejects a missing or inactive product', async () => {
      tx.user.findUnique.mockResolvedValue(user);
      tx.product.findUnique.mockResolvedValue({
        ...product,
        isActive: false,
      });

      await expect(service.createForAdmin(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.product.update).not.toHaveBeenCalled();
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it('rejects when stock is insufficient', async () => {
      tx.user.findUnique.mockResolvedValue(user);
      tx.product.findUnique.mockResolvedValue({
        ...product,
        stock: 1,
      });

      await expect(service.createForAdmin(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.product.update).not.toHaveBeenCalled();
      expect(tx.order.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllForAdmin', () => {
    it('applies filters, pagination and response mapping', async () => {
      const order = makeOrder();
      prisma.order.findMany.mockResolvedValue([order]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.getAllForAdmin({
        page: 2,
        limit: 5,
        status: OrderStatus.PENDING,
        search: 'ORD',
      });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: OrderStatus.PENDING,
            OR: [
              { userId: { contains: 'ORD', mode: 'insensitive' } },
              { orderNumber: { contains: 'ORD', mode: 'insensitive' } },
            ],
          },
          skip: 5,
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(prisma.order.count).toHaveBeenCalled();
      expect(result.data.data[0].orderNumber).toBe('ORD-123');
      expect(result.data.total).toBe(1);
    });
  });

  describe('getAllForUser', () => {
    it('always scopes the query to the requested user', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      const result = await service.getAllForUser({}, 'user-1');

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 10,
        }),
      );
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result.data.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns an order belonging to the requested user', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());

      const result = await service.findOne('order-1', 'user-1');

      expect(result.data.orderNumber).toBe('ORD-123');
    });

    it('hides an order that belongs to another user', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ userId: 'another-user' }),
      );

      await expect(service.findOne('order-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-order')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('sends a shipping email when status changes to SHIPPED', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: OrderStatus.PENDING }),
      );
      const updated = makeOrder({ status: OrderStatus.SHIPPED });
      prisma.order.update.mockResolvedValue(updated);

      await service.update('order-1', { status: OrderStatus.SHIPPED });

      expect(mailService.sendOrderShippedEmail).toHaveBeenCalledWith(updated);
      expect(mailService.sendOrderDeliveredEmail).not.toHaveBeenCalled();
    });

    it('does not resend a shipping email when status was already SHIPPED', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: OrderStatus.SHIPPED }),
      );
      prisma.order.update.mockResolvedValue(
        makeOrder({ status: OrderStatus.SHIPPED }),
      );

      await service.update('order-1', { status: OrderStatus.SHIPPED });

      expect(mailService.sendOrderShippedEmail).not.toHaveBeenCalled();
    });

    it('throws when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing-order', { status: OrderStatus.SHIPPED }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancels a pending order and restores product stock', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());

      const canceledOrder = makeOrder({ status: OrderStatus.CANCELED });
      tx.order.update.mockResolvedValue(canceledOrder);
      tx.product.update.mockResolvedValue({});

      const result = await service.cancel('order-1', 'user-1');

      expect(tx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { status: OrderStatus.CANCELED },
        }),
      );
      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { stock: { increment: 2 } },
      });
      expect(result.data.status).toBe(OrderStatus.CANCELED);
    });

    it('rejects cancellation of an order that is not pending', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: OrderStatus.SHIPPED }),
      );

      await expect(service.cancel('order-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('hides an order owned by another user', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ userId: 'another-user' }),
      );

      await expect(service.cancel('order-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('confirmDelivery', () => {
    it('confirms delivery and sends a notification email', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: OrderStatus.SHIPPED }),
      );
      const delivered = makeOrder({ status: OrderStatus.DELIVERED });
      prisma.order.update.mockResolvedValue(delivered);

      const result = await service.confirmDelivery('order-1', 'user-1');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { status: OrderStatus.DELIVERED },
        }),
      );
      expect(mailService.sendOrderDeliveredEmail).toHaveBeenCalledWith(
        delivered,
      );
      expect(result.data.status).toBe(OrderStatus.DELIVERED);
    });

    it('rejects delivery confirmation for an order not yet shipped', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());

      await expect(
        service.confirmDelivery('order-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('hides an order owned by another user', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ userId: 'another-user' }),
      );

      await expect(
        service.confirmDelivery('order-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelStalePendingOrders', () => {
    it('cancels only pending orders older than the cutoff', async () => {
      prisma.order.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.cancelStalePendingOrders(24);

      expect(prisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.PENDING,
            createdAt: { lt: expect.any(Date) },
          }),
          data: { status: OrderStatus.CANCELED },
        }),
      );
      expect(result).toBe(3);
    });
  });
});
