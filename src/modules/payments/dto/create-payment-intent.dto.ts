import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
export class CreatePaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string = 'usd';

  @IsOptional()
  @IsString()
  description?: string;
}
