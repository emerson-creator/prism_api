import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-07-29.dahlia',
    });
  }

  private mapPaymentToResponseDto(payment: {
    id: string;
    orderId: string;
    userId: string;
    amount: Prisma.Decimal;
    currency: string;
    status: PaymentStatus;
    paymentMethod: string | null;
    transactionId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentResponseDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount.toNumber(),
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  async createPaymentIntent(
    createPaymentIntentDto: CreatePaymentIntentDto,
    userId: string,
  ): Promise<{
    success: boolean;
    data: {
      clientSecret: string;
      paymentId: string;
    };
    message: string;
  }> {
    const { orderId, amount, currency = 'usd' } = createPaymentIntentDto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const existingPayment = await this.prisma.payment.findFirst({
      where: { orderId },
    });

    if (existingPayment && existingPayment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Payment for this order has already been completed',
      );
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      metadata: { orderId, userId },
      currency,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        userId,
        amount,
        currency,
        status: PaymentStatus.PENDING,
        paymentMethod: 'STRIPE',
        transactionId: paymentIntent.id,
      },
    });

    return {
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret!,
        paymentId: payment.id,
      },
      message: 'Payment intent created successfully',
    };
  }

  async confirmPayment(
    confirmPaymentDto: ConfirmPaymentDto,
    userId: string,
  ): Promise<{
    success: boolean;
    data: PaymentResponseDto;
    message: string;
  }> {
    const { paymentIntentId, orderId } = confirmPaymentDto;

    const payment = await this.prisma.payment.findFirst({
      where: { transactionId: paymentIntentId, orderId, userId },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment with intent ID ${paymentIntentId} not found for order ${orderId}`,
      );
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment has already been completed');
    }

    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException(
        'Payment intent is not in a succeeded state',
      );
    }

    const [updatedPayment] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          orderId: true,
          userId: true,
          amount: true,
          currency: true,
          status: true,
          paymentMethod: true,
          transactionId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PROCESSING',
        },
      }),
    ]);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
    });

    if (order?.cartId) {
      await this.prisma.cart.update({
        where: { id: order.cartId },
        data: {
          checkedOut: true,
        },
      });
    }

    return {
      success: true,
      data: this.mapPaymentToResponseDto(updatedPayment),
      message: 'Payment confirmed successfully',
    };
  }

  async getAllPayments(userId: string): Promise<{
    success: boolean;
    data: PaymentResponseDto[];
    message: string;
  }> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: payments.map((payment) => this.mapPaymentToResponseDto(payment)),
      message: 'List of all payments',
    };
  }

  async findOne(
    paymentId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    data: PaymentResponseDto;
    message: string;
  }> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    return {
      success: true,
      data: this.mapPaymentToResponseDto(payment),
      message: 'Payment details',
    };
  }

  // Get payment for order id
  async findByOrderId(
    orderId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    data: PaymentResponseDto;
    message: string;
  }> {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId, userId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment for order ${orderId} not found`);
    }

    return {
      success: true,
      data: this.mapPaymentToResponseDto(payment),
      message: 'Payment details',
    };
  }
}
