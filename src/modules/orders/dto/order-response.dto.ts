// DTO for order response

import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'The unique identifier of the order item' })
  id!: string;

  @ApiProperty({
    description: 'The ID of the product associated with the order item',
  })
  productId!: string;

  @ApiProperty({ description: 'The name of the product ordered' })
  productName!: string;

  @ApiProperty({ description: 'The quantity of the product ordered' })
  quantity!: number;

  @ApiProperty({ description: 'The price of the product ordered' })
  price!: number;

  @ApiProperty({
    description: 'The subtotal price for this order item (quantity * price)',
  })
  subtotal!: number;

  @ApiProperty({ description: 'Created at timestamp for the order item' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at timestamp for the order item' })
  updatedAt!: Date;
}

export class OrderApiResponseDto<T> {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success!: boolean;

  @ApiProperty({ description: 'The data returned from the request' })
  data!: T | null;

  @ApiProperty({
    description:
      'A message providing additional information about the response',
  })
  message!: string | null;
}

export class OrderResponseDto {
  @ApiProperty({ description: 'The unique identifier of the order' })
  id!: string;

  @ApiProperty({ description: 'The ID of the user who placed the order' })
  userId!: string;

  @ApiProperty({ description: 'The status of the order' })
  status!: string;

  @ApiProperty({ description: 'The total amount for the order' })
  total!: number;

  @ApiProperty({ description: 'The shipping address for the order' })
  shippingAddress!: string;

  @ApiProperty({
    description: 'The items included in the order',
    type: [OrderItemResponseDto],
  })
  items!: OrderItemResponseDto[];

  @ApiProperty({ description: 'Created at timestamp for the order' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at timestamp for the order' })
  updatedAt!: Date;
}

export class PaginatedOrderResponseDto {
  @ApiProperty({ type: [OrderResponseDto], description: 'List of orders' })
  data!: OrderResponseDto[];

  @ApiProperty({ description: 'Total number of orders available' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Number of orders per page' })
  limit!: number;
}
