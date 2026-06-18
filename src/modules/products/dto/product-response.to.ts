// Product Response DTO
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsBoolean,
} from 'class-validator';
export class ProductResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The unique identifier of the product',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    example: 'Product Name',
    description: 'The name of the product',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'Product Description',
    description: 'The description of the product',
  })
  @IsString()
  description!: string | null;

  @ApiProperty({
    example: 19.99,
    description: 'The price of the product',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @ApiProperty({
    example: 100,
    description: 'The stock quantity of the product',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  stock!: number;

  @ApiProperty({
    example: 'SKU12345',
    description: 'The SKU (Stock Keeping Unit) of the product',
  })
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @ApiProperty({
    example: 'https://example.com/product-image.jpg',
    description: 'The URL of the product image',
  })
  @IsString()
  @IsNotEmpty()
  imageUrl!: string | null;

  @ApiProperty({
    example: 'Electronics',
    description: 'The category of the product',
  })
  @IsString()
  @IsNotEmpty()
  category!: string | null;

  @ApiProperty({
    example: true,
    description: 'Indicates if the product is active',
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'The date and time when the product was created',
  })
  @IsString()
  @IsNotEmpty()
  createdAt!: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'The date and time when the product was last updated',
  })
  @IsString()
  @IsNotEmpty()
  updatedAt!: Date;
}
