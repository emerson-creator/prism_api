import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersCleanupTask {
  private readonly logger = new Logger(OrdersCleanupTask.name);

  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Runs every hour. Cancels PENDING orders older than 24h that were
   * never paid — they're checkout attempts that were abandoned
   * (closed the Stripe tab, card declined and never retried, etc.).
   * Safe to automate: PENDING → CANCELED never touches money or stock.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleStalePendingOrders() {
    const cancelledCount =
      await this.ordersService.cancelStalePendingOrders(24);

    if (cancelledCount > 0) {
      this.logger.log(
        `Auto-cancelled ${cancelledCount} stale PENDING order(s) older than 24h.`,
      );
    }
  }
}
