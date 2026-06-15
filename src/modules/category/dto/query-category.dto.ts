// DTO for querying categories with pagination and filtering

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';

export class QueryCategoryDto {
  @ApiPropertyOptional({
    description: 'Search term for category name or description',
    example: 'electronics',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page for pagination',
    example: 10,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit: number = 10;
}
