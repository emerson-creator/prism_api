import { Controller, Post, Get } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { Body, Param } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import {
  CreatePaymentIntentApiResponseDto,
  PaymentApiResponseDto,
} from './dto/payment-response.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiTags('Payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiResponse({ status: 400, description: 'The order cannot be paid.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
    type: CreatePaymentIntentApiResponseDto,
  })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @GetUser('id') userId: string,
  ) {
    return await this.paymentsService.createPaymentIntent(
      createPaymentIntentDto,
      userId,
    );
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm a payment intent' })
  @ApiResponse({ status: 400, description: 'Payment confirmation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Payment or order not found.' })
  @ApiResponse({
    status: 200,
    description: 'Payment intent confirmed successfully',
    type: PaymentApiResponseDto,
  })
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto,
    @GetUser('id') userId: string,
  ) {
    return await this.paymentsService.confirmPayment(confirmPaymentDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 200,
    description: 'List of all payments',
    type: [PaymentApiResponseDto],
  })
  async getAllPayments(@GetUser('id') userId: string) {
    return await this.paymentsService.getAllPayments(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  @ApiResponse({
    status: 200,
    description: 'Payment details',
    type: PaymentApiResponseDto,
  })
  async findOne(@GetUser('id') userId: string, @Param('id') paymentId: string) {
    return await this.paymentsService.findOne(paymentId, userId);
  }

  // Get payment for order id
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get a payment by order ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  @ApiResponse({
    status: 200,
    description: 'Payment details for the given order ID',
    type: PaymentApiResponseDto,
  })
  async findByOrderId(
    @GetUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return await this.paymentsService.findByOrderId(orderId, userId);
  }

}
