import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
} from 'class-validator';

class OrderItemDto {
  @ApiProperty({ description: 'The ID of the product being ordered' })
  @IsNotEmpty()
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'The quantity of the product being ordered' })
  @IsNotEmpty()
  @IsNumber()
  quantity!: number;

  // Sin `price`: el precio siempre se deriva de Product.price en el server
}

export class CreateOrderDto {
  @ApiProperty({ description: 'ID del usuario para el que se crea la orden' })
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  shippingAddress?: string;
}
