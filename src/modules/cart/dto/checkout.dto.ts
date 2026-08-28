import { IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsString()
  shippingAddress?: string;
}
