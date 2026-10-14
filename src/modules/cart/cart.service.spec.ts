import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from './cart.service';
import { generateOrderNumber } from '../../common/utils/order-number';

jest.mock('../../common/utils/order-number', () => ({
  generateOrderNumber: jest.fn(),
}));

describe('CartService', () => {
  let service: CartService;

  let prisma: any;
  let tx: any;

  const product = {
    id: 'product-1',
    name: 'Keyboard',
    price: 25.5,
    stock: 10,
    isActive: true,
  };

  const makeCart = (overrides: Record<string, any> = {}) => ({
    id: 'cart-1',
    userId: 'user-1',
    checkedOut: false,
    cartItems: [],
    ...overrides,
  });

  const makeCartItem = (overrides: Record<string, any> = {}) => ({
    id: 'item-1',
    cartId: 'cart-1',
    productId: 'product-1',
    quantity: 2,
    product,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    tx = {
      order: {
        create: jest.fn(),
      },
      cart: {
        update: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      cart: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    (generateOrderNumber as jest.Mock).mockResolvedValue('ORD-123');

    const module: TestingModule = await Test.createTestingModule({
      providers: [CartService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('getOrCreateCart', () => {
    it('returns the existing open cart', async () => {
      const cart = makeCart();
      prisma.cart.findFirst.mockResolvedValue(cart);

      await expect(service.getOrCreateCart('user-1')).resolves.toBe(cart);

      expect(prisma.cart.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', checkedOut: false },
        include: {
          cartItems: {
            include: { product: true },
          },
        },
      });
      expect(prisma.cart.create).not.toHaveBeenCalled();
    });

    it('creates a cart when no open cart exists', async () => {
      const cart = makeCart();
      prisma.cart.findFirst.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue(cart);

      await expect(service.getOrCreateCart('user-1')).resolves.toBe(cart);

      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
        include: {
          cartItems: {
            include: { product: true },
          },
        },
      });
    });
  });

  describe('getCart', () => {
    it('returns the current cart for the user', async () => {
      const cart = makeCart();
      prisma.cart.findFirst.mockResolvedValue(cart);

      await expect(service.getCart('user-1')).resolves.toBe(cart);
    });
  });

  describe('addItem', () => {
    it('adds a product to the cart', async () => {
      const cart = makeCart();
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cart.findFirst.mockResolvedValue(cart);
      prisma.cartItem.findUnique.mockResolvedValue(null);

      await service.addItem('user-1', {
        productId: 'product-1',
        quantity: 2,
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          productId: 'product-1',
          quantity: 2,
        },
      });
    });

    it('increments quantity when the product is already in the cart', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.cart.findFirst.mockResolvedValue(makeCart());
      prisma.cartItem.findUnique.mockResolvedValue(
        makeCartItem({ quantity: 2 }),
      );

      await service.addItem('user-1', {
        productId: 'product-1',
        quantity: 3,
      });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 5 },
      });
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });

    it('rejects a product that does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem('user-1', { productId: 'missing-product', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.cart.findFirst).not.toHaveBeenCalled();
    });

    it('rejects an inactive product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        isActive: false,
      });

      await expect(
        service.addItem('user-1', { productId: 'product-1', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a quantity exceeding available stock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stock: 1,
      });

      await expect(
        service.addItem('user-1', { productId: 'product-1', quantity: 2 }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });

    it('rejects increasing an existing item beyond stock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        stock: 4,
      });
      prisma.cart.findFirst.mockResolvedValue(makeCart());
      prisma.cartItem.findUnique.mockResolvedValue(
        makeCartItem({ quantity: 3 }),
      );

      await expect(
        service.addItem('user-1', { productId: 'product-1', quantity: 2 }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });
  });

  describe('updateItem', () => {
    it('updates the quantity of an item in the user cart', async () => {
      prisma.cart.findFirst.mockResolvedValue(makeCart());
      prisma.cartItem.findFirst.mockResolvedValue(makeCartItem());
      prisma.cartItem.update.mockResolvedValue(
        makeCartItem({ quantity: 4 }),
      );

      await service.updateItem('user-1', 'item-1', { quantity: 4 });

      expect(prisma.cartItem.findFirst).toHaveBeenCalledWith({
        where: { id: 'item-1', cartId: 'cart-1' },
        include: { product: true },
      });
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 4 },
      });
    });

    it('rejects an item that does not belong to the cart', async () => {
      prisma.cart.findFirst.mockResolvedValue(makeCart());
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem('user-1', 'other-item', { quantity: 1 }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });

    it('rejects a quantity exceeding product stock', async () => {
      prisma.cart.findFirst.mockResolvedValue(makeCart());
      prisma.cartItem.findFirst.mockResolvedValue(
        makeCartItem({ product: { ...product, stock: 2 } }),
      );

      await expect(
        service.updateItem('user-1', 'item-1', { quantity: 3 }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    it('removes an item belonging to the cart', async () => {
      prisma.cart.findFirst.mockResolvedValue(makeCart());
      prisma.cartItem.findFirst.mockResolvedValue(makeCartItem());
      prisma.cartItem.delete.mockResolvedValue(makeCartItem());

      await service.removeItem('user-1', 'item-1');

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('rejects removing an item that is not in the cart', async () => {
      prisma.cart.findFirst.mockResolvedValue(makeCart());
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem('user-1', 'other-item')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.cartItem.delete).not.toHaveBeenCalled();
    });
  });

  describe('clearCart', () => {
    it('deletes all items belonging to the cart', async () => {
      prisma.cart.findFirst.mockResolvedValue(makeCart());
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });

      await service.clearCart('user-1');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
    });
  });

  describe('checkout', () => {
    const checkoutDto = {
      shippingAddress: '123 Main Street',
    };

    it('rejects checkout when the cart is empty', async () => {
      prisma.cart.findFirst.mockResolvedValue(makeCart());

      await expect(service.checkout('user-1', checkoutDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects checkout when a product is inactive', async () => {
      prisma.cart.findFirst.mockResolvedValue(
        makeCart({
          cartItems: [
            makeCartItem({
              product: { ...product, isActive: false },
            }),
          ],
        }),
      );

      await expect(service.checkout('user-1', checkoutDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects checkout when stock is insufficient', async () => {
      prisma.cart.findFirst.mockResolvedValue(
        makeCart({
          cartItems: [
            makeCartItem({
              quantity: 5,
              product: { ...product, stock: 2 },
            }),
          ],
        }),
      );

      await expect(service.checkout('user-1', checkoutDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('creates an order using product prices and checks out the cart', async () => {
      const cart = makeCart({
        cartItems: [
          makeCartItem({ quantity: 2 }),
          makeCartItem({
            id: 'item-2',
            productId: 'product-2',
            quantity: 1,
            product: {
              id: 'product-2',
              name: 'Mouse',
              price: 10,
              stock: 5,
              isActive: true,
            },
          }),
        ],
      });

      const createdOrder = {
        id: 'order-1',
        orderNumber: 'ORD-123',
        total: 61,
        orderItems: [],
      };

      prisma.cart.findFirst.mockResolvedValue(cart);
      tx.order.create.mockResolvedValue(createdOrder);
      tx.cart.update.mockResolvedValue({ ...cart, checkedOut: true });

      await expect(service.checkout('user-1', checkoutDto)).resolves.toBe(
        createdOrder,
      );

      expect(generateOrderNumber).toHaveBeenCalledWith(tx);
      expect(tx.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderNumber: 'ORD-123',
          userId: 'user-1',
          cartId: 'cart-1',
          totalAmount: 61,
          total: 61,
          shippingAddress: checkoutDto.shippingAddress,
          orderItems: {
            create: [
              {
                productId: 'product-1',
                quantity: 2,
                price: 25.5,
              },
              {
                productId: 'product-2',
                quantity: 1,
                price: 10,
              },
            ],
          },
        }),
        include: { orderItems: true },
      });
      expect(tx.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { checkedOut: true },
      });
    });
  });
});
