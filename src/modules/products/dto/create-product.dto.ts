// DTO created for creating a new product
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsBoolean,
} from 'class-validator';
export class CreateProductDto {
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
  @IsNotEmpty()
  description?: string;

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
  @MaxLength(50)
  sku!: string;

  @ApiProperty({
    example: 'https://example.com/product-image.jpg',
    description: 'The URL of the product image',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    example: 'Electronics',
    description: 'The category of the product',
  })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({
    example: true,
    description: 'Indicates if the product is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
