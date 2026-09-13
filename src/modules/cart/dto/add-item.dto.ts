import { IsInt, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddItemDto {
  @ApiProperty({ description: 'Product ID to add to the cart' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'Number of units to add', example: 2, minimum: 1 })
  @IsInt()
  @IsPositive()
  quantity!: number;
}
