import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Order, OrderItem, Product, User } from '@prisma/client';

type OrderWithDetails = Order & {
  orderItems: (OrderItem & { product: Product })[];
  user: User;
};

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly fromAddress = 'Prism Store <onboarding@resend.dev>'; // change with your own domain and verified email address

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  async sendOrderReceivedEmail(order: OrderWithDetails) {
    await this.send(
      order.user.email,
      `We received your order #${order.orderNumber}`,
      this.orderReceivedTemplate(order),
    );
  }

  async sendOrderShippedEmail(order: OrderWithDetails) {
    await this.send(
      order.user.email,
      `Your order #${order.orderNumber} is on its way`,
      this.orderShippedTemplate(order),
    );
  }

  async sendOrderDeliveredEmail(order: OrderWithDetails) {
    await this.send(
      order.user.email,
      `Thank you for your purchase at Prism Store`,
      this.orderDeliveredTemplate(order),
    );
  }

  // We never let an email failure break the business flow (payment/order already saved successfully)
  private async send(to: string, subject: string, html: string) {
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to}: ${message}`);
    }
  }

  private itemsRows(order: OrderWithDetails): string {
    return order.orderItems
      .map(
        (item) => `
      <tr>
        <td style="padding:8px 0;color:#0a0a0a;font-size:14px;">${item.product.name} × ${item.quantity}</td>
        <td style="padding:8px 0;color:#0a0a0a;font-size:14px;text-align:right;">$${(Number(item.price) * item.quantity).toFixed(2)}</td>
      </tr>`,
      )
      .join('');
  }

  private baseTemplate(title: string, bodyHtml: string): string {
    return `
    <div style="background:#f4f4f5;padding:32px 0;font-family:'Inter',Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr>
          <td style="padding:32px 32px 16px 32px;">
            <div style="font-family:'Poppins',Helvetica,Arial,sans-serif;font-size:22px;font-weight:600;color:#0a0a0a;">Prism<span style="color:#6366f1;">Store</span></div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px 32px;">
            <h1 style="font-family:'Poppins',Helvetica,Arial,sans-serif;font-size:20px;color:#0a0a0a;margin:0 0 16px 0;">${title}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;background:#f4f4f5;border-top:1px solid #e4e4e7;">
            <p style="font-size:12px;color:#71717a;margin:0;">Prism Store — this email was generated automatically, please do not reply to this message.</p>
          </td>
        </tr>
      </table>
    </div>`;
  }

  private orderReceivedTemplate(order: OrderWithDetails): string {
    return this.baseTemplate(
      'We received your order!',
      `
      <p style="font-size:14px;color:#0a0a0a;">Hi ${order.user.name || ''}, we confirm your order <strong>#${order.orderNumber}</strong>. We will let you know when it ships to your address.</p>
      <table role="presentation" width="100%" style="margin-top:16px;border-top:1px solid #e4e4e7;padding-top:12px;">
        ${this.itemsRows(order)}
        <tr><td style="padding-top:12px;font-weight:600;color:#0a0a0a;font-size:14px;">Total</td><td style="padding-top:12px;text-align:right;font-weight:600;color:#0a0a0a;font-size:14px;">$${Number(order.total).toFixed(2)}</td></tr>
      </table>`,
    );
  }

  private orderShippedTemplate(order: OrderWithDetails): string {
    return this.baseTemplate(
      'Your order is on its way 🚚',
      `
      <p style="font-size:14px;color:#0a0a0a;">Your order <strong>#${order.orderNumber}</strong> has been shipped${order.trackingNumber ? ` with tracking number <strong>${order.trackingNumber}</strong>` : ''}.</p>
      <p style="font-size:14px;color:#0a0a0a;">Once you receive it, please confirm it from your account to complete the order.</p>`,
    );
  }

  private orderDeliveredTemplate(order: OrderWithDetails): string {
    return this.baseTemplate(
      'Thank you for your purchase! 🎉',
      `<p style="font-size:14px;color:#0a0a0a;">We confirm the delivery of your order <strong>#${order.orderNumber}</strong>. We hope you enjoy it.</p>`,
    );
  }
}
