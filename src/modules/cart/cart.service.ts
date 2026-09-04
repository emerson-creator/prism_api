import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { generateOrderNumber } from '../../common/utils/order-number';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private cartInclude = {
    cartItems: {
      include: {
        product: true,
      },
    },
  };

  /**
   * Obtiene el carrito abierto del usuario (checkedOut = false).
   * Si no existe, lo crea.
   */
  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findFirst({
      where: { userId, checkedOut: false },
      include: this.cartInclude,
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: this.cartInclude,
      });
    }

    return cart;
  }

  async getCart(userId: string) {
    return this.getOrCreateCart(userId);
  }

  async addItem(userId: string, dto: AddItemDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        productId_cartId: {
          productId: dto.productId,
          cartId: cart.id,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;

      if (product.stock < newQuantity) {
        throw new BadRequestException('Insufficient stock');
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateItemDto) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (item.product.stock < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return this.getOrCreateCart(userId);
  }

  /**
   * Convierte el carrito actual en una Order:
   * - Valida stock de cada producto
   * - Crea Order + OrderItems dentro de una transacción
   * - Descuenta stock
   * - Marca el carrito como checkedOut
   */
  async checkout(userId: string, dto: CheckoutDto) {
    const cart = await this.getOrCreateCart(userId);

    if (cart.cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.cartItems) {
      if (!item.product.isActive) {
        throw new BadRequestException(
          `Product "${item.product.name}" is no longer available`,
        );
      }
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}"`,
        );
      }
    }

    const totalAmount = cart.cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber: await generateOrderNumber(tx),
          userId,
          cartId: cart.id,
          totalAmount,
          total: totalAmount,
          shippingAddress: dto.shippingAddress,
          orderItems: {
            create: cart.cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
        include: {
          orderItems: true,
        },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { checkedOut: true },
      });

      return createdOrder;
    });

    return order;
  }
}
