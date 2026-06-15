// DTO for creating a new category
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
export class CreateCategoryDto {
  @ApiProperty({
    description: 'Name of the category',
    example: 'Electronics',
  })
  @IsString()
  @IsNotEmpty()
  name: string = '';

  @ApiProperty({
    description: 'Description of the category',
    example: 'All kinds of electronic devices and gadgets.',
  })
  @IsString()
  @IsOptional()
  description: string | null = null;

  @ApiProperty({
    description: 'URL-friendly slug for the category',
    example: 'electronics',
  })
  @IsString()
  @IsOptional()
  slug: string | null = null;

  @ApiProperty({
    description: 'URL of the category image',
    example: 'https://example.com/images/electronics.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl: string | null = null;

  @ApiProperty({
    description: 'Indicates if the category is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive: boolean = true;
}
