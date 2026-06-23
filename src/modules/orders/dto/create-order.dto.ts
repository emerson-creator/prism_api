import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsNumber } from 'class-validator';

class OrderItemDto {
  @ApiProperty({ description: 'The ID of the product being ordered' })
  @IsNotEmpty()
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'The quantity of the product being ordered' })
  @IsNotEmpty()
  @IsNumber()
  quantity!: number;

  @ApiProperty({ description: 'The price of the product being ordered' })
  @IsNotEmpty()
  @IsNumber()
  price!: number;
}

export class CreateOrderDto {
  @ApiProperty({
    type: [OrderItemDto],
    description: 'List of items in the order',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  shippingAddress!: string;
}
