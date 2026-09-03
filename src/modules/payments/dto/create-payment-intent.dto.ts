import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
export class CreatePaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsOptional()
  @IsString()
  currency?: string = 'usd';

  @IsOptional()
  @IsString()
  description?: string;
}
