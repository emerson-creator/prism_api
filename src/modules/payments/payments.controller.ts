import { Controller, Post } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { PaymentIntentApiResponseDto } from './dto/payment-response.dto';
import { Body } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

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
    type: PaymentIntentApiResponseDto,
  })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ): Promise<PaymentIntentApiResponseDto> {
    return await this.paymentsService.createPaymentIntent(
      createPaymentIntentDto,
    );
  }
}
