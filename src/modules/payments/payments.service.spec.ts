import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  })),
);

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    order: {
      findUnique: jest.Mock;
    };
    payment: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mailService: {
    sendOrderReceivedEmail: jest.Mock;
    sendOrderRefundedEmail: jest.Mock;
  };
  let stripe: {
    paymentIntents: {
      create: jest.Mock;
      retrieve: jest.Mock;
    };
    refunds: {
      create: jest.Mock;
    };
    webhooks: {
      constructEvent: jest.Mock;
    };
  };

  const userId = 'user-1';
  const orderId = 'order-1';
  const paymentId = 'payment-1';
  const intentId = 'pi_test_123';

  const makePayment = (overrides: Record<string, unknown> = {}) => ({
    id: paymentId,
    orderId,
    userId,
    amount: { toNumber: () => 25.5 },
    currency: 'usd',
    status: PaymentStatus.PENDING,
    paymentMethod: 'STRIPE',
    transactionId: intentId,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_payments_service';

    prisma = {
      order: {
        findUnique: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mailService = {
      sendOrderReceivedEmail: jest.fn(),
      sendOrderRefundedEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    stripe = (service as any).stripe;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('throws when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent({ orderId }, userId),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.payment.findFirst).not.toHaveBeenCalled();
      expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('does not allow paying for another user’s order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        userId: 'another-user',
        total: { toNumber: () => 25.5 },
      });

      await expect(
        service.createPaymentIntent({ orderId }, userId),
      ).rejects.toThrow(NotFoundException);

      expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('rejects an order whose payment is already completed', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        userId,
        total: { toNumber: () => 25.5 },
      });
      prisma.payment.findFirst.mockResolvedValue(
        makePayment({ status: PaymentStatus.COMPLETED }),
      );

      await expect(
        service.createPaymentIntent({ orderId }, userId),
      ).rejects.toThrow(BadRequestException);

      expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('creates a Stripe intent and a pending payment', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        userId,
        total: { toNumber: () => 25.5 },
      });
      prisma.payment.findFirst.mockResolvedValue(null);
      stripe.paymentIntents.create.mockResolvedValue({
        id: intentId,
        client_secret: 'secret_test_123',
      });
      prisma.payment.create.mockResolvedValue(makePayment());

      const result = await service.createPaymentIntent({ orderId }, userId);

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 2550,
        metadata: { orderId, userId },
        currency: 'usd',
      });
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          userId,
          amount: 25.5,
          currency: 'usd',
          status: PaymentStatus.PENDING,
          paymentMethod: 'STRIPE',
          transactionId: intentId,
        }),
      });
      expect(result).toEqual({
        success: true,
        data: {
          clientSecret: 'secret_test_123',
          paymentId,
        },
        message: 'Payment intent created successfully',
      });
    });
  });

  describe('confirmPayment', () => {
    it('throws when the payment cannot be found for the user and order', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmPayment({ paymentIntentId: intentId, orderId }, userId),
      ).rejects.toThrow(NotFoundException);

      expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
    });

    it('rejects a Stripe intent that has not succeeded', async () => {
      prisma.payment.findFirst.mockResolvedValue(makePayment());
      stripe.paymentIntents.retrieve.mockResolvedValue({
        id: intentId,
        status: 'requires_payment_method',
      });

      await expect(
        service.confirmPayment({ paymentIntentId: intentId, orderId }, userId),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentIntentFailed', () => {
    it('does nothing when no payment matches the Stripe intent', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await service.handlePaymentIntentFailed({
        id: intentId,
      } as Stripe.PaymentIntent);

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('marks an unsuccessful payment as failed', async () => {
      prisma.payment.findFirst.mockResolvedValue(makePayment());

      await service.handlePaymentIntentFailed({
        id: intentId,
      } as Stripe.PaymentIntent);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED },
      });
    });

    it('does not change a completed payment to failed', async () => {
      prisma.payment.findFirst.mockResolvedValue(
        makePayment({ status: PaymentStatus.COMPLETED }),
      );

      await service.handlePaymentIntentFailed({
        id: intentId,
      } as Stripe.PaymentIntent);

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentIntentSucceeded', () => {
    it('does nothing when the Stripe intent has no matching payment', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await service.handlePaymentIntentSucceeded({
        id: intentId,
      } as Stripe.PaymentIntent);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('refundPayment', () => {
    it('throws when no payment exists for the order', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.refundPayment(orderId)).rejects.toThrow(
        NotFoundException,
      );

      expect(stripe.refunds.create).not.toHaveBeenCalled();
    });

    it('rejects a payment that is not completed', async () => {
      prisma.payment.findFirst.mockResolvedValue(makePayment());

      await expect(service.refundPayment(orderId)).rejects.toThrow(
        BadRequestException,
      );

      expect(stripe.refunds.create).not.toHaveBeenCalled();
    });

    it('returns an already-refunded payment without refunding twice', async () => {
      const payment = makePayment({
        status: PaymentStatus.REFUNDED,
      });
      prisma.payment.findFirst.mockResolvedValue(payment);

      const result = await service.refundPayment(orderId);

      expect(result).toEqual({
        id: paymentId,
        orderId,
        userId,
        amount: 25.5,
        currency: 'usd',
        status: PaymentStatus.REFUNDED,
        paymentMethod: 'STRIPE',
        transactionId: intentId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      });
      expect(stripe.refunds.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getAllPayments', () => {
    it('returns the user’s payments mapped to response DTOs', async () => {
      prisma.payment.findMany.mockResolvedValue([makePayment()]);

      const result = await service.getAllPayments(userId);

      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: paymentId,
          orderId,
          userId,
          amount: 25.5,
          currency: 'usd',
          status: PaymentStatus.PENDING,
        }),
      );
    });

    it('returns an empty list when the user has no payments', async () => {
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getAllPayments(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the requested payment for its owner', async () => {
      prisma.payment.findFirst.mockResolvedValue(makePayment());

      const result = await service.findOne(paymentId, userId);

      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { id: paymentId, userId },
      });
      expect(result.data.amount).toBe(25.5);
    });

    it('throws when the payment is not found for the user', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.findOne(paymentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByOrderId', () => {
    it('returns the payment for the specified order and user', async () => {
      prisma.payment.findFirst.mockResolvedValue(makePayment());

      const result = await service.findByOrderId(orderId, userId);

      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { orderId, userId },
      });
      expect(result.data.orderId).toBe(orderId);
    });

    it('throws when no payment exists for the user and order', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.findByOrderId(orderId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
