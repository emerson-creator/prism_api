import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'The unique identifier for the payment intent to confirm',
    example: 'pi_1J2Y3Z4A5B6C7D8E9F0G1H2I',
  })
  @IsString()
  @IsNotEmpty()
  paymentIntentId!: string;

  @IsNotEmpty()
  @IsString()
  orderId!: string;
}
