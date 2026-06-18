// Update product DTO with partialtype to allow partial updates
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
export class UpdateProductDto extends PartialType(CreateProductDto) {}
