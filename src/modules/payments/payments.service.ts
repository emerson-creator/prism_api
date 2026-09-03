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
    const { orderId, currency = 'usd' } = createPaymentIntentDto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const existingPayment = await this.prisma.payment.findFirst({
      where: { orderId },
    });

    if (existingPayment) {
      if (existingPayment.status === PaymentStatus.COMPLETED) {
        throw new BadRequestException(
          'Payment for this order has already been completed',
        );
      }

      if (existingPayment.status === PaymentStatus.PENDING) {
        // Ya hay un intento vigente para esta orden — reusarlo en vez de crear otro.
        const existingIntent = await this.stripe.paymentIntents.retrieve(
          existingPayment.transactionId!,
        );

        // Si el intent de Stripe sigue utilizable, lo devolvemos tal cual.
        if (
          existingIntent.status === 'requires_payment_method' ||
          existingIntent.status === 'requires_confirmation' ||
          existingIntent.status === 'requires_action'
        ) {
          return {
            success: true,
            data: {
              clientSecret: existingIntent.client_secret!,
              paymentId: existingPayment.id,
            },
            message: 'Payment intent already exists for this order',
          };
        }

        // Si quedó en un estado muerto (canceled, expirado, etc.), lo marcamos
        // como FAILED y dejamos que el flujo siga para crear uno nuevo.
        await this.prisma.payment.update({
          where: { id: existingPayment.id },
          data: { status: PaymentStatus.FAILED },
        });
      }
    }

    const amount = order.total.toNumber();

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
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

  /**
   * Lógica central: marca el pago como COMPLETED, descuenta stock,
   * actualiza la orden y el carrito. No depende de userId —
   * la llaman tanto confirmPayment() (flujo manual) como
   * handleStripeWebhook() (flujo automático).
   * Es idempotente: si el payment ya está COMPLETED, no hace nada.
   */
  private async finalizeSuccessfulPayment(paymentId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${paymentId} not found`);
      }

      // Idempotencia: si ya se procesó (por el flujo manual o un webhook
      // duplicado), no repetir el descuento de stock.
      if (payment.status === PaymentStatus.COMPLETED) {
        return payment;
      }

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      for (const item of order.orderItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found.`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}.`,
          );
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.COMPLETED, updatedAt: new Date() },
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
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PROCESSING' },
      });

      if (order.cartId) {
        await tx.cart.update({
          where: { id: order.cartId },
          data: { checkedOut: true },
        });
      }

      return updated;
    });
  }

  async confirmPayment(
    confirmPaymentDto: ConfirmPaymentDto,
    userId: string,
  ): Promise<{ success: boolean; data: PaymentResponseDto; message: string }> {
    const { paymentIntentId, orderId } = confirmPaymentDto;

    const payment = await this.prisma.payment.findFirst({
      where: { transactionId: paymentIntentId, orderId, userId },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment with intent ID ${paymentIntentId} not found for order ${orderId}`,
      );
    }

    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException(
        'Payment intent is not in a succeeded state',
      );
    }

    const updatedPayment = await this.finalizeSuccessfulPayment(
      payment.id,
      orderId,
    );

    return {
      success: true,
      data: this.mapPaymentToResponseDto(updatedPayment),
      message: 'Payment confirmed successfully',
    };
  }

  /**
   * Handle a successful payment intent.
   * Llamado por el controller de webhook, ya con el evento validado.
   */
  async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: { transactionId: paymentIntent.id },
    });

    if (!payment) {
      // No lo tratamos como error fatal: puede ser un intent de otra
      // integración, o uno creado y nunca guardado por un fallo previo.
      return;
    }

    await this.finalizeSuccessfulPayment(payment.id, payment.orderId);
  }

  async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: { transactionId: paymentIntent.id },
    });

    if (!payment || payment.status === PaymentStatus.COMPLETED) {
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
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
