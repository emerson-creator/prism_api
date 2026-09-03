import { Controller } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Body, Post } from '@nestjs/common';
import { ModerateThrottle } from '../../common/decorators/custom-throttler.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderApiResponseDto } from './dto/order-response.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { OrdersService } from './orders.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Get } from '@nestjs/common';
import { LenientThrottle } from 'src/common/decorators/custom-throttler.decorator';
import { Query } from '@nestjs/common';
import { QueryOrderDto } from './dto/query-order.dto';
import { Param } from '@nestjs/common';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Patch, Delete } from '@nestjs/common';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Create order endpoint, accessible by authenticated users
  @Post('/admin')
  @Roles(Role.ADMIN) // Only admin users can access this endpoint
  @ModerateThrottle() // Apply moderate throttling to the create order endpoint
  @ApiOperation({ summary: 'Manage orders' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({
    status: 200,
    description: 'Order created successfully.',
    type: OrderApiResponseDto,
  })
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return await this.ordersService.createForAdmin(createOrderDto);
  }

  // Get all orders endpoint, accessible by admin users
  // Limit, pagination, and filtering can be added here as needed
  @Get('admin/all')
  @Roles(Role.ADMIN) // Only admin users can access this endpoint
  @LenientThrottle() // Apply lenient throttling to the get all orders endpoint
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination (default is 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of orders per page for pagination (default is 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter orders by status (e.g., PENDING, COMPLETED)',
  })
  @ApiOperation({ summary: 'Get all orders (Admin only)' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiResponse({
    status: 200,
    description: 'List of all orders retrieved successfully.',
    type: [OrderApiResponseDto],
  })
  async getAllOrdersAdmin(@Query() query: QueryOrderDto) {
    return await this.ordersService.getAllForAdmin(query);
  }

  // Get own orders endpoint, accessible by authenticated users
  @Get('my-orders')
  @LenientThrottle() // Apply lenient throttling to the get own orders endpoint
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination (default is 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of orders per page for pagination (default is 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter orders by status (e.g., PENDING, COMPLETED)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description:
      'Search for orders by user ID or order number (case-insensitive)',
  })
  @ApiOperation({ summary: 'Get own orders' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiResponse({
    status: 200,
    description: 'List of own orders retrieved successfully.',
    type: [OrderApiResponseDto],
  })
  async findAll(@Query() query: QueryOrderDto, @GetUser('id') userId: string) {
    return await this.ordersService.getAllForUser(query, userId);
  }

  //Admin: get order by ID
  @Get('admin/:id')
  @Roles(Role.ADMIN) // Only admin users can access this endpoint
  @LenientThrottle() // Apply lenient throttling to the get order by ID endpoint
  @ApiOperation({ summary: 'Get order by ID (Admin only)' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiResponse({
    status: 200,
    description: 'Order retrieved successfully.',
    type: OrderApiResponseDto,
  })
  async getOrderByIdAdmin(@Param('id') id: string) {
    return await this.ordersService.findOne(id);
  }

  //User: get own order by ID
  @Get(':id')
  @LenientThrottle() // Apply lenient throttling to the get own order by ID endpoint
  @ApiOperation({ summary: 'Get own order by ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiResponse({
    status: 200,
    description: 'Own order retrieved successfully.',
    type: OrderApiResponseDto,
  })
  async getOwnOrderById(
    @Param('id') id: string,
    @GetUser('id') userId: string,
  ) {
    const orderResponse = await this.ordersService.findOne(id, userId);
    return orderResponse;
  }

  // ADMIN: update order
  @Patch('admin/:id')
  @Roles(Role.ADMIN) // Only admin users can access this endpoint
  @ApiOperation({ summary: 'Update order (Admin only)' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiResponse({
    status: 200,
    description: 'Order updated successfully.',
    type: OrderApiResponseDto,
  })
  async updateOrderAdmin(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return await this.ordersService.update(id, updateOrderDto);
  }

  // USER: update own order
  @Patch(':id')
  @ApiOperation({ summary: 'Update own order' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiResponse({
    status: 200,
    description: 'Own order updated successfully.',
    type: OrderApiResponseDto,
  })
  async updateOwnOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @GetUser('id') userId: string,
  ) {
    return await this.ordersService.update(id, updateOrderDto, userId);
  }

  //ADMin: Cancel order
  @Delete('admin/:id')
  @Roles(Role.ADMIN) // Only admin users can access this endpoint
  @ModerateThrottle() // Apply moderate throttling to the cancel order endpoint
  @ApiOperation({ summary: 'Cancel order (Admin only)' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiResponse({
    status: 200,
    description: 'Order canceled successfully.',
    type: OrderApiResponseDto,
  })
  async cancelOrderAdmin(@Param('id') id: string) {
    return await this.ordersService.cancel(id);
  }

  //USER: Cancel own order
  @Delete(':id')
  @ModerateThrottle() // Apply moderate throttling to the cancel own order endpoint
  @ApiOperation({ summary: 'Cancel own order' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  @ApiResponse({
    status: 200,
    description: 'Own order canceled successfully.',
    type: OrderApiResponseDto,
  })
  async cancelOwnOrder(@Param('id') id: string, @GetUser('id') userId: string) {
    return await this.ordersService.cancel(id, userId);
  }
}
