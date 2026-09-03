import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
