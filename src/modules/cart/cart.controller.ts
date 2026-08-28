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

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@GetUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  addItem(@GetUser('id') userId: string, @Body() dto: AddItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:itemId')
  updateItem(
    @GetUser('id') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(userId, itemId, dto);
  }

  @Delete('items/:itemId')
  removeItem(@GetUser('id') userId: string, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete()
  clearCart(@GetUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Post('checkout')
  checkout(@GetUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.cartService.checkout(userId, dto);
  }
}
