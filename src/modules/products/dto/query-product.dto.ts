// DTO for querying products with pagination and filtering

import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsBoolean, Min } from 'class-validator';
export class QueryProductsDto {
  @ApiProperty({
    example: 'Category Name',
    description: 'Filter products by category name',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  // isActive filter to get only active products
  @ApiProperty({
    example: true,
    description: 'Filter products by active status',
    required: false,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  //search filter to search products by name or description
  @ApiProperty({
    example: 'search term',
    description: 'Search products by name or description',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    example: 1,
    description: 'The page number for pagination',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @ApiProperty({
    example: 10,
    description: 'The number of items per page for pagination',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit: number = 10;
}
