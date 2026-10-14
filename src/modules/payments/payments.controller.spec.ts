import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const paymentsServiceMock = {
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
    refundPayment: jest.fn(),
    getAllPayments: jest.fn(),
    findOne: jest.fn(),
    findByOrderId: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: paymentsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    const dto = { orderId: 'order-123', currency: 'usd' } as any;
    const userId = 'user-123';
    const response = {
      success: true,
      data: { clientSecret: 'secret-123', paymentId: 'payment-123' },
      message: 'Payment intent created successfully',
    };

    it('creates a payment intent using the DTO and authenticated user ID', async () => {
      paymentsServiceMock.createPaymentIntent.mockResolvedValue(response);

      await expect(
        controller.createPaymentIntent(dto, userId),
      ).resolves.toEqual(response);

      expect(paymentsServiceMock.createPaymentIntent).toHaveBeenCalledWith(
        dto,
        userId,
      );
      expect(paymentsServiceMock.createPaymentIntent).toHaveBeenCalledTimes(1);
    });

    it('propagates service errors', async () => {
      const error = new Error('Payment intent creation failed');
      paymentsServiceMock.createPaymentIntent.mockRejectedValue(error);

      await expect(
        controller.createPaymentIntent(dto, userId),
      ).rejects.toBe(error);
    });
  });

  describe('confirmPayment', () => {
    const dto = {
      paymentIntentId: 'intent-123',
      orderId: 'order-123',
    } as any;
    const userId = 'user-123';
    const response = {
      success: true,
      data: { id: 'payment-123', status: 'COMPLETED' },
      message: 'Payment confirmed successfully',
    };

    it('confirms a payment using the DTO and authenticated user ID', async () => {
      paymentsServiceMock.confirmPayment.mockResolvedValue(response);

      await expect(controller.confirmPayment(dto, userId)).resolves.toEqual(
        response,
      );

      expect(paymentsServiceMock.confirmPayment).toHaveBeenCalledWith(
        dto,
        userId,
      );
      expect(paymentsServiceMock.confirmPayment).toHaveBeenCalledTimes(1);
    });

    it('propagates service errors', async () => {
      const error = new Error('Payment confirmation failed');
      paymentsServiceMock.confirmPayment.mockRejectedValue(error);

      await expect(controller.confirmPayment(dto, userId)).rejects.toBe(error);
    });
  });

  describe('refundPayment', () => {
    const orderId = 'order-123';
    const payment = { id: 'payment-123', status: 'REFUNDED' };

    it('returns the standard success response after refunding an order', async () => {
      paymentsServiceMock.refundPayment.mockResolvedValue(payment);

      await expect(controller.refundPayment(orderId)).resolves.toEqual({
        success: true,
        data: payment,
        message: 'Payment refunded successfully',
      });

      expect(paymentsServiceMock.refundPayment).toHaveBeenCalledWith(orderId);
      expect(paymentsServiceMock.refundPayment).toHaveBeenCalledTimes(1);
    });

    it('propagates service errors', async () => {
      const error = new Error('Refund failed');
      paymentsServiceMock.refundPayment.mockRejectedValue(error);

      await expect(controller.refundPayment(orderId)).rejects.toBe(error);
    });
  });

  describe('getAllPayments', () => {
    const userId = 'user-123';
    const response = {
      success: true,
      data: [{ id: 'payment-123' }],
      message: 'List of all payments',
    };

    it('returns the payments belonging to the authenticated user', async () => {
      paymentsServiceMock.getAllPayments.mockResolvedValue(response);

      await expect(controller.getAllPayments(userId)).resolves.toEqual(
        response,
      );

      expect(paymentsServiceMock.getAllPayments).toHaveBeenCalledWith(userId);
      expect(paymentsServiceMock.getAllPayments).toHaveBeenCalledTimes(1);
    });

    it('propagates service errors', async () => {
      const error = new Error('Could not retrieve payments');
      paymentsServiceMock.getAllPayments.mockRejectedValue(error);

      await expect(controller.getAllPayments(userId)).rejects.toBe(error);
    });
  });

  describe('findOne', () => {
    const userId = 'user-123';
    const paymentId = 'payment-123';
    const response = {
      success: true,
      data: { id: paymentId },
      message: 'Payment details',
    };

    it('retrieves a payment using its ID and the authenticated user ID', async () => {
      paymentsServiceMock.findOne.mockResolvedValue(response);

      await expect(controller.findOne(userId, paymentId)).resolves.toEqual(
        response,
      );

      expect(paymentsServiceMock.findOne).toHaveBeenCalledWith(
        paymentId,
        userId,
      );
      expect(paymentsServiceMock.findOne).toHaveBeenCalledTimes(1);
    });

    it('propagates service errors', async () => {
      const error = new Error('Payment not found');
      paymentsServiceMock.findOne.mockRejectedValue(error);

      await expect(controller.findOne(userId, paymentId)).rejects.toBe(error);
    });
  });

  describe('findByOrderId', () => {
    const userId = 'user-123';
    const orderId = 'order-123';
    const response = {
      success: true,
      data: { id: 'payment-123', orderId },
      message: 'Payment details',
    };

    it('retrieves a payment using the order ID and authenticated user ID', async () => {
      paymentsServiceMock.findByOrderId.mockResolvedValue(response);

      await expect(
        controller.findByOrderId(userId, orderId),
      ).resolves.toEqual(response);

      expect(paymentsServiceMock.findByOrderId).toHaveBeenCalledWith(
        orderId,
        userId,
      );
      expect(paymentsServiceMock.findByOrderId).toHaveBeenCalledTimes(1);
    });

    it('propagates service errors', async () => {
      const error = new Error('Payment for order not found');
      paymentsServiceMock.findByOrderId.mockRejectedValue(error);

      await expect(
        controller.findByOrderId(userId, orderId),
      ).rejects.toBe(error);
    });
  });
});
