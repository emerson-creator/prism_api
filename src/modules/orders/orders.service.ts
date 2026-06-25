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

  // Create a new order for a user
  async create(
    createOrderDto: CreateOrderDto,
    userId: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const { items, shippingAddress } = createOrderDto;

    // Wrap everything inside an interactive transaction to prevent race conditions
    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch the active cart within the transaction
      const latestCart = await tx.cart.findFirst({
        where: { userId, checkout: false },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestCart) {
        throw new NotFoundException(
          `No active cart found for user with ID ${userId}.`,
        );
      }

      // 2. Validate stock and deduct inventory sequentially using the transaction client ('tx')
      for (const item of items) {
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
            `Insufficient stock for product with ID ${item.productId}. Available stock: ${product.stock}.`,
          );
        }

        // Deduct the inventory immediately inside the transaction bubble
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 3. Calculate total amount
      const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // 4. Create the master order and child order items
      return await tx.order.create({
        data: {
          userId,
          totalAmount: total,
          total,
          status: OrderStatus.PENDING,
          shippingAddress,
          cartId: latestCart.id,
          orderItems: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          user: true, // Pulls the user object for email/name
          orderItems: {
            include: {
              product: true, //  Correctly nested! Pulls the product object for item.product.name
            },
          },
        },
      });
    });

    // 5. Build and return the final clean API response structure
    return {
      success: true,
      data: this.formatOrderResponse(order),
      message: 'Order created successfully.',
    };
  }

  // get all orders for admin with optional filters
  async getAllForAdmin(query: QueryOrderDto): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
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
      data: orders.map((order) => this.formatOrderResponse(order)),
      total,
      page,
      limit,
    };
  }

  // Get user current orders
  async getAllForUser(
    query: QueryOrderDto,
    userId: string,
  ): Promise<PaginatedOrderResponseDto> {
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
      data: orders.map((order) => this.formatOrderResponse(order)),
      total,
      page,
      limit,
    };
  }

  // Get order by ID for admin
  async findOne(id: string): Promise<OrderApiResponseDto<OrderResponseDto>> {
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

    return {
      success: true,
      data: this.formatOrderResponse(order),
      message: 'Order retrieved successfully.',
    };
  }
}
