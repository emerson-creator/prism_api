import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiPropertyOptional({ description: 'Shipping address for the new order' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;
}
