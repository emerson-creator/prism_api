import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;

  let ordersService: {
    createForAdmin: jest.Mock;
    getAllForAdmin: jest.Mock;
    getAllForUser: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    cancel: jest.Mock;
    confirmDelivery: jest.Mock;
  };

  const orderResponse = {
    success: true,
    message: 'Order operation completed',
    data: {
      id: 'order-1',
      orderNumber: 'ORD-123',
      status: OrderStatus.PENDING,
    },
  };

  const paginatedResponse = {
    success: true,
    data: {
      data: [orderResponse.data],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    ordersService = {
      createForAdmin: jest.fn(),
      getAllForAdmin: jest.fn(),
      getAllForUser: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      confirmDelivery: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrder', () => {
    it('delegates order creation to the service', async () => {
      const dto = {
        userId: 'user-1',
        items: [{ productId: 'product-1', quantity: 2 }],
        shippingAddress: '123 Main Street',
      };
      ordersService.createForAdmin.mockResolvedValue(orderResponse);

      await expect(controller.createOrder(dto)).resolves.toBe(orderResponse);
      expect(ordersService.createForAdmin).toHaveBeenCalledWith(dto);
    });

    it('propagates service errors', async () => {
      const error = new Error('Order creation failed');
      ordersService.createForAdmin.mockRejectedValue(error);

      await expect(
        controller.createOrder({
          userId: 'user-1',
          items: [{ productId: 'product-1', quantity: 1 }],
        }),
      ).rejects.toBe(error);
    });
  });

  describe('getAllOrdersAdmin', () => {
    it('passes filters and pagination to the service', async () => {
      const query = {
        page: 2,
        limit: 5,
        status: OrderStatus.PENDING,
        search: 'ORD',
      };
      ordersService.getAllForAdmin.mockResolvedValue(paginatedResponse);

      await expect(controller.getAllOrdersAdmin(query)).resolves.toBe(
        paginatedResponse,
      );
      expect(ordersService.getAllForAdmin).toHaveBeenCalledWith(query);
    });
  });

  describe('findAll', () => {
    it('passes the query and authenticated user ID to the service', async () => {
      const query = { page: 1, limit: 10 };
      ordersService.getAllForUser.mockResolvedValue(paginatedResponse);

      await expect(controller.findAll(query, 'user-1')).resolves.toBe(
        paginatedResponse,
      );
      expect(ordersService.getAllForUser).toHaveBeenCalledWith(
        query,
        'user-1',
      );
    });
  });

  describe('getOrderByIdAdmin', () => {
    it('fetches an order by ID without a user restriction', async () => {
      ordersService.findOne.mockResolvedValue(orderResponse);

      await expect(
        controller.getOrderByIdAdmin('order-1'),
      ).resolves.toBe(orderResponse);
      expect(ordersService.findOne).toHaveBeenCalledWith('order-1');
    });
  });

  describe('getOwnOrderById', () => {
    it('passes both order ID and user ID to the service', async () => {
      ordersService.findOne.mockResolvedValue(orderResponse);

      await expect(
        controller.getOwnOrderById('order-1', 'user-1'),
      ).resolves.toBe(orderResponse);
      expect(ordersService.findOne).toHaveBeenCalledWith(
        'order-1',
        'user-1',
      );
    });
  });

  describe('updateOrderAdmin', () => {
    it('updates an order without a user restriction', async () => {
      const dto = { status: OrderStatus.SHIPPED };
      ordersService.update.mockResolvedValue(orderResponse);

      await expect(
        controller.updateOrderAdmin('order-1', dto),
      ).resolves.toBe(orderResponse);
      expect(ordersService.update).toHaveBeenCalledWith('order-1', dto);
    });
  });

  describe('confirmOwnDelivery', () => {
    it('confirms delivery for the authenticated user', async () => {
      ordersService.confirmDelivery.mockResolvedValue(orderResponse);

      await expect(
        controller.confirmOwnDelivery('order-1', 'user-1'),
      ).resolves.toBe(orderResponse);
      expect(ordersService.confirmDelivery).toHaveBeenCalledWith(
        'order-1',
        'user-1',
      );
    });
  });

  describe('updateOwnOrder', () => {
    it('passes the user ID when updating an own order', async () => {
      const dto = { notes: 'Please leave at reception' };
      ordersService.update.mockResolvedValue(orderResponse);

      await expect(
        controller.updateOwnOrder('order-1', dto, 'user-1'),
      ).resolves.toBe(orderResponse);
      expect(ordersService.update).toHaveBeenCalledWith(
        'order-1',
        dto,
        'user-1',
      );
    });
  });

  describe('cancelOrderAdmin', () => {
    it('cancels an order without a user restriction', async () => {
      ordersService.cancel.mockResolvedValue(orderResponse);

      await expect(
        controller.cancelOrderAdmin('order-1'),
      ).resolves.toBe(orderResponse);
      expect(ordersService.cancel).toHaveBeenCalledWith('order-1');
    });
  });

  describe('cancelOwnOrder', () => {
    it('passes the user ID when cancelling an own order', async () => {
      ordersService.cancel.mockResolvedValue(orderResponse);

      await expect(
        controller.cancelOwnOrder('order-1', 'user-1'),
      ).resolves.toBe(orderResponse);
      expect(ordersService.cancel).toHaveBeenCalledWith(
        'order-1',
        'user-1',
      );
    });
  });
});
