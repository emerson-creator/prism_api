import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderApiResponseDto } from './dto/order-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createOrderDto: CreateOrderDto,
    userId: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const { items, shippingAddress } = createOrderDto;

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID ${item.productId} not found.`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product with ID ${item.productId}. Available stock: ${product.stock}.`,
        );
      }
    }

    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const latestCart = await this.prisma.cart.findFirst({
      where: { userId, checkout: false },
      orderBy: { createdAt: 'desc' },
    });

    const order = await this.prisma.order.create({
      data: {
        userId,
        totalAmount: total,
        total: total,
        shippingAddress,
        cartId: latestCart?.id || '', // Use the latest non-checkout cart ID or a placeholder
        orderItems: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });

    return {
      success: true,
      data: this.formatOrderResponse(order),
      message: 'Order created successfully.',
    };
  }

  private formatOrderResponse(order: any): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      total: order.total.toNumber(),
      shippingAddress: order.shippingAddress || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.orderItems.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: 'Product',
        quantity: item.quantity,
        price: item.price.toNumber(),
        subtotal: item.price.toNumber() * item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }
}
