import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MailModule } from '../mail/mail.module';
import { OrdersCleanupTask } from './order-cleanup.task';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrdersCleanupTask],
  imports: [MailModule],
})
export class OrdersModule {}
