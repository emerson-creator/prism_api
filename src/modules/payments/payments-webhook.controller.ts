// payments-webhook.controller.ts
import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import type Stripe from 'stripe';
import { PaymentsService } from './payments.service';

@Controller('payments')
@SkipThrottle() // Stripe puede reintentar eventos en ráfaga; no lo limitamos.
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  // Sin JwtAuthGuard a propósito: Stripe no manda JWT.
  // La seguridad acá es la verificación de firma (constructWebhookEvent).
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    let event: Stripe.Event;
    try {
      event = this.paymentsService.constructWebhookEvent(
        req.rawBody,
        signature,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.paymentsService.handlePaymentIntentSucceeded(
          event.data.object,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.paymentsService.handlePaymentIntentFailed(event.data.object);
        break;
    }

    return { received: true };
  }
}
