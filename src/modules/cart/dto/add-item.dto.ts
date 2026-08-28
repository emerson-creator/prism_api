import { IsInt, IsPositive, IsString } from 'class-validator';

export class AddItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}
