import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderApiResponseDto } from './dto/order-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Order } from '@prisma/client';
import { OrderItem } from '@prisma/client';
import { User } from '@prisma/client';
import { Product } from '@prisma/client';
import { QueryOrderDto } from './dto/query-order.dto';
import { PaginatedOrderResponseDto } from './dto/order-response.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Prisma } from '@prisma/client';
import { generateOrderNumber } from 'src/common/utils/order-number';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private formatOrderResponse(
    order: Order & {
      orderItems: (OrderItem & { product: Product })[];
      user: User;
    },
  ): OrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      total: order.total.toNumber(),
      shippingAddress: order.shippingAddress || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.orderItems.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price.toNumber(),
        subtotal: item.price.toNumber() * item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      ...(order.user && {
        userEmail: order.user.email,
        userName: `${order.user.name} ${order.user.lastName || ''}`,
      }),
    };
  }

  async createForAdmin(
    dto: CreateOrderDto,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const { userId, items, shippingAddress } = dto;

    const order = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }

      const orderItemsData: {
        productId: string;
        quantity: number;
        price: Prisma.Decimal;
      }[] = [];
      let total = 0;

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found.`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product with ID ${item.productId}. Available stock: ${product.stock}.`,
          );
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price, // ← siempre del servidor, nunca del DTO
        });

        total += Number(product.price) * item.quantity;
      }

      return tx.order.create({
        data: {
          orderNumber: await generateOrderNumber(tx),
          userId,
          total,
          totalAmount: total, // temporal, hasta migrar el schema
          status: OrderStatus.PENDING,
          shippingAddress,
          orderItems: { create: orderItemsData },
        },
        include: {
          user: true,
          orderItems: { include: { product: true } },
        },
      });
    });

    return {
      success: true,
      data: this.formatOrderResponse(order),
      message: 'Order created successfully.',
    };
  }

  // get all orders for admin with optional filters
  async getAllForAdmin(
    query: QueryOrderDto,
  ): Promise<OrderApiResponseDto<PaginatedOrderResponseDto>> {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { userId: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      success: true,
      data: {
        data: orders.map((order) => this.formatOrderResponse(order)),
        total,
        page,
        limit,
      },
      message: 'Orders retrieved successfully.',
    };
  }

  // Get user current orders
  async getAllForUser(
    query: QueryOrderDto,
    userId: string,
  ): Promise<OrderApiResponseDto<PaginatedOrderResponseDto>> {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { userId: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      success: true,
      data: {
        data: orders.map((order) => this.formatOrderResponse(order)),
        total,
        page,
        limit,
      },
      message: 'Orders retrieved successfully.',
    };
  }

  // Get order by ID for admin
  async findOne(
    id: string,
    userId?: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found.`);
    }

    if (userId && order.userId !== userId) {
      throw new NotFoundException(`Order with ID ${id} not found.`);
    }

    return {
      success: true,
      data: this.formatOrderResponse(order),
      message: 'Order retrieved successfully.',
    };
  }

  // Update order by ID for admin
  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userId?: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found.`);
    }

    if (userId && order.userId !== userId) {
      throw new NotFoundException(`Order with ID ${id} not found.`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        ...updateOrderDto,
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    return {
      success: true,
      data: this.formatOrderResponse(updatedOrder),
      message: 'Order updated successfully.',
    };
  }

  // Cancel order by ID for admin
  async cancel(
    id: string,
    userId?: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found.`);
    }
    if (userId && order.userId !== userId) {
      throw new NotFoundException(`Order with ID ${id} not found.`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Only pending orders can be canceled.`);
    }

    const canceledOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Update the order status to CANCELED
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELED },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });

      // 2. Restore the stock for each product in the order
      for (const item of updatedOrder.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return updatedOrder;
    });

    return {
      success: true,
      data: this.formatOrderResponse(canceledOrder),
      message: 'Order canceled successfully.',
    };
  }
}
