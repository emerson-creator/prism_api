import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateItemDto {
  @ApiProperty({ description: 'New quantity for the cart item', example: 2, minimum: 1 })
  @IsInt()
  @IsPositive()
  quantity!: number;
}
