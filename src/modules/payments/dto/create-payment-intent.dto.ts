import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Order ID to pay for' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiPropertyOptional({ description: 'Three-letter ISO currency code', example: 'usd', default: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string = 'usd';

  @ApiPropertyOptional({ description: 'Optional payment description' })
  @IsOptional()
  @IsString()
  description?: string;
}
