import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MailModule } from '../mail/mail.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [MailModule],
})
export class OrdersModule {}
