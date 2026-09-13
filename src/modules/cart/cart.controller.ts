import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CheckoutDto } from './dto/checkout.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@UseGuards(JwtAuthGuard)
@Controller('cart')
@ApiTags('Cart')
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getCart(@GetUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product to the cart' })
  @ApiResponse({ status: 201, description: 'Item added successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid quantity or insufficient stock.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  addItem(@GetUser('id') userId: string, @Body() dto: AddItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update a cart item quantity' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid quantity or insufficient stock.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  updateItem(
    @GetUser('id') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(userId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove an item from the cart' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Cart item removed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Cart item not found.' })
  removeItem(@GetUser('id') userId: string, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Remove all items from the cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  clearCart(@GetUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create an order from the current cart' })
  @ApiResponse({ status: 201, description: 'Checkout completed successfully.' })
  @ApiResponse({ status: 400, description: 'Cart is empty or stock is insufficient.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  checkout(@GetUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.cartService.checkout(userId, dto);
  }
}
