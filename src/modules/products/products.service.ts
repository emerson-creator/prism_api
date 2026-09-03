import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductResponseDto } from './dto/product-response.to';
import { Prisma } from '@prisma/client';
import { Product } from '@prisma/client';
import { Category } from '@prisma/client';
import { QueryProductsDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    // check if a product with the same SKU already exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { sku: createProductDto.sku },
    });
    if (existingProduct) {
      throw new ConflictException('SKU already exists');
    }
    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        price: new Prisma.Decimal(createProductDto.price),
      },
      include: { category: true },
    });

    return this.toProductResponseDto(product);
  }

  private toProductResponseDto(
    product: Product & { category: Category },
  ): ProductResponseDto {
    return {
      ...product,
      price: Number(product.price),
      category: product.category ? product.category.name : null,
    };
  }

  async findAll(queryDto: QueryProductsDto): Promise<{
    data: ProductResponseDto[];
    meta: {
      totalItems: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const { category, isActive, search, page = 1, limit = 10 } = queryDto;

    // 1. Build the filtering object
    const where: Prisma.ProductWhereInput = {};

    if (category) {
      where.category = { name: category };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 2. Calculate pagination offsets
    const skip = (page - 1) * limit;

    // 3. Execute queries concurrently for better performance
    const [products, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // Optional: highly recommended to keep pagination stable
        include: { category: true }, // Adjust based on your actual relation needs
      }),
      this.prisma.product.count({ where }),
    ]);

    // 4. Calculate total pages
    const totalPages = Math.ceil(totalItems / limit);

    // Map products to DTOs if necessary (optional, can be done in the controller)
    const mappedProducts = products.map((product) =>
      this.toProductResponseDto(product),
    );

    // 5. Return mapped data and metadata
    return {
      data: mappedProducts,
      meta: {
        totalItems,
        page,
        limit,
        totalPages,
      },
    };
  }

  // Get a single product by ID
  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.toProductResponseDto(product);
  }

  // Update a product by ID
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    // Check if the product exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    if (updateProductDto.sku) {
      // Check if a product with the same SKU already exists (excluding the current product)
      const skuExists = await this.prisma.product.findFirst({
        where: {
          sku: updateProductDto.sku,
          NOT: { id }, // Exclude the current product from the check
        },
      });
      if (skuExists) {
        throw new ConflictException('SKU already exists');
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        price: updateProductDto.price
          ? new Prisma.Decimal(updateProductDto.price)
          : undefined,
      },
      include: { category: true },
    });

    return this.toProductResponseDto(updatedProduct);
  }

  // Update product stock by ID
  async updateStock(id: string, quantity: number): Promise<ProductResponseDto> {
    // Check if the product exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    const newStock = existingProduct.stock + quantity;
    if (newStock < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        stock: quantity,
      },
      include: { category: true },
    });

    return this.toProductResponseDto(updatedProduct);
  }

  // Remove a product by ID
  async remove(id: string): Promise<ProductResponseDto> {
    // Check if the product exists
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, orderItems: true, cartItems: true }, // Include order items to check for associations
    });
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    if (existingProduct.stock > 0) {
      throw new ConflictException(
        'Cannot delete a product with stock remaining',
      );
    }

    if (existingProduct.orderItems && existingProduct.orderItems.length > 0) {
      throw new ConflictException(
        'Cannot delete a product that has associated order items',
      );
    }

    const deletedProduct = await this.prisma.product.delete({
      where: { id },
      include: { category: true },
    });
    return this.toProductResponseDto(deletedProduct);
  }
}
