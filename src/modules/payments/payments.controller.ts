import { Controller, Post, Get } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { Body, Param } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { PaymentApiResponseDto } from './dto/payment-response.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiTags('Payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
    type: PaymentApiResponseDto,
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
  @ApiResponse({
    status: 200,
    description: 'Payment details',
    type: PaymentApiResponseDto,
  })
  async findOne(@GetUser('id') userId: string, @Param('id') paymentId: string) {
    return await this.paymentsService.findOne(paymentId, userId);
  }
}
