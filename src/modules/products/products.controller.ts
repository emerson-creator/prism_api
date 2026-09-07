import { Controller, Delete } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  Body,
  Post,
  UseGuards,
  Get,
  Param,
  Patch,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { Query } from '@nestjs/common';
import { QueryProductsDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadImageResponseDto } from './dto/upload-image-response.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // create product endpoint, only accessible by admin users
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'The product has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiResponse({ status: 409, description: 'SKU already exists.' })
  async create(@Body() createProductDto: CreateProductDto) {
    return await this.productService.create(createProductDto);
  }

  // Upload a product image to Cloudinary, only accessible by admin users.
  // Returns a URL to use as `imageUrl` when creating/updating a product —
  // this endpoint does NOT create or update a product itself.
  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, mirrors CloudinaryService's own check
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a product image (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully.',
    type: UploadImageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (missing or invalid file).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadImageResponseDto> {
    return await this.cloudinaryService.uploadImage(file);
  }

  // get all products endpoint
  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({
    status: 200,
    description: 'List of products retrieved successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async findAll(@Query() queryDto: QueryProductsDto) {
    return await this.productService.findAll(queryDto);
  }

  // Get product by ID endpoint
  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({
    status: 200,
    description: 'The product has been successfully retrieved.',
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async findOne(@Param('id') id: string) {
    return await this.productService.findOne(id);
  }

  //Update product endpoint, only accessible by admin users
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a product by ID' })
  @ApiResponse({
    status: 200,
    description: 'The product has been successfully updated.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    // Implement the update logic in the service layer
    return await this.productService.update(id, updateProductDto);
  }

  // Update product stock endpoint, only accessible by admin users
  @Post(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update product stock by ID' })
  @ApiResponse({
    status: 200,
    description: 'The product stock has been successfully updated.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async updateStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    // Implement the update stock logic in the service layer
    return await this.productService.updateStock(id, quantity);
  }

  // Remove product endpoint, only accessible by admin users
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove a product by ID' })
  @ApiResponse({
    status: 200,
    description: 'The product has been successfully removed.',
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async remove(@Param('id') id: string) {
    return await this.productService.remove(id);
  }
}
