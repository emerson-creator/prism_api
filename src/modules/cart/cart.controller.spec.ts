import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController', () => {
  let controller: CartController;

  let cartService: {
    getCart: jest.Mock;
    addItem: jest.Mock;
    updateItem: jest.Mock;
    removeItem: jest.Mock;
    clearCart: jest.Mock;
    checkout: jest.Mock;
  };

  const cart = {
    id: 'cart-1',
    userId: 'user-1',
    checkedOut: false,
    cartItems: [],
  };

  beforeEach(async () => {
    cartService = {
      getCart: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      checkout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: cartService }],
    }).compile();

    controller = module.get<CartController>(CartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCart', () => {
    it('gets the cart for the authenticated user', async () => {
      cartService.getCart.mockResolvedValue(cart);

      await expect(controller.getCart('user-1')).resolves.toBe(cart);
      expect(cartService.getCart).toHaveBeenCalledWith('user-1');
    });
  });

  describe('addItem', () => {
    it('passes the authenticated user and DTO to the service', async () => {
      const dto = { productId: 'product-1', quantity: 2 };
      cartService.addItem.mockResolvedValue(cart);

      await expect(controller.addItem('user-1', dto)).resolves.toBe(cart);
      expect(cartService.addItem).toHaveBeenCalledWith('user-1', dto);
    });

    it('propagates service errors', async () => {
      const error = new Error('Insufficient stock');
      cartService.addItem.mockRejectedValue(error);

      await expect(
        controller.addItem('user-1', {
          productId: 'product-1',
          quantity: 20,
        }),
      ).rejects.toBe(error);
    });
  });

  describe('updateItem', () => {
    it('passes the user ID, item ID and update DTO to the service', async () => {
      const dto = { quantity: 4 };
      cartService.updateItem.mockResolvedValue(cart);

      await expect(
        controller.updateItem('user-1', 'item-1', dto),
      ).resolves.toBe(cart);

      expect(cartService.updateItem).toHaveBeenCalledWith(
        'user-1',
        'item-1',
        dto,
      );
    });
  });

  describe('removeItem', () => {
    it('passes the user ID and item ID to the service', async () => {
      cartService.removeItem.mockResolvedValue(cart);

      await expect(controller.removeItem('user-1', 'item-1')).resolves.toBe(
        cart,
      );

      expect(cartService.removeItem).toHaveBeenCalledWith('user-1', 'item-1');
    });
  });

  describe('clearCart', () => {
    it('clears the authenticated user cart', async () => {
      cartService.clearCart.mockResolvedValue(cart);

      await expect(controller.clearCart('user-1')).resolves.toBe(cart);
      expect(cartService.clearCart).toHaveBeenCalledWith('user-1');
    });
  });

  describe('checkout', () => {
    it('passes the authenticated user and checkout DTO to the service', async () => {
      const dto = { shippingAddress: '123 Main Street' };
      const order = { id: 'order-1', total: 51 };
      cartService.checkout.mockResolvedValue(order);

      await expect(controller.checkout('user-1', dto)).resolves.toBe(order);

      expect(cartService.checkout).toHaveBeenCalledWith('user-1', dto);
    });

    it('propagates checkout errors', async () => {
      const error = new Error('Cart is empty');
      cartService.checkout.mockRejectedValue(error);

      await expect(
        controller.checkout('user-1', {
          shippingAddress: '123 Main Street',
        }),
      ).rejects.toBe(error);
    });
  });
});
