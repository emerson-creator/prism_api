import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({
    description: 'The unique identifier for the payment',
    example: 'pi_1J2Y3Z4A5B6C7D8E9F0G1H2I',
  })
  id!: string;

  @ApiProperty({
    description:
      'The unique identifier for the order associated with the payment',
    example: 'order_1234567890',
  })
  orderId!: string;

  @ApiProperty({
    description: 'The amount of the payment in cents',
    example: 5000,
  })
  amount!: number;

  @ApiProperty({
    description: 'The unique identifier for the user who made the payment',
    example: 'user_9876543210',
  })
  userId!: string;

  @ApiProperty({
    description: 'The currency of the payment',
    example: 'usd',
  })
  currency!: string;

  @ApiProperty({
    description: 'The status of the payment',
    example: 'succeeded',
  })
  status!: string;

  @ApiProperty({
    description: 'The payment method used for the payment',
    example: 'card',
  })
  paymentMethod!: string | null;

  @ApiProperty({
    description:
      'The unique identifier for the transaction associated with the payment',
    example: 'txn_1J2Y3Z4A5B6C7D8E9F0G1H2I',
  })
  transactionId!: string | null;

  @ApiProperty({
    description: 'The timestamp when the payment was created',
    example: '2023-01-01T12:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'The timestamp when the payment was last updated',
    example: '2023-01-01T12:00:00Z',
  })
  updatedAt!: Date;
}

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Stripe client secret for the payment intent',
    example: 'pi_1J2Y3Z4A5B6C7D8E9F0G1H2I_secret_123456',
  })
  clientSecret!: string;

  @ApiProperty({
    description: 'The unique identifier for the payment intent',
    example: 'pi_1J2Y3Z4A5B6C7D8E9F0G1H2I',
  })
  paymentId!: string;
}

export class PaymentApiResponseDto {
  @ApiProperty({
    description: 'Indicates whether the payment was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Message providing additional information about the payment',
    example: 'Payment processed successfully',
  })
  message?: string;
  @ApiProperty({
    description: 'The payment response data',
    type: CreatePaymentIntentDto,
  })
  data!: CreatePaymentIntentDto;
}
