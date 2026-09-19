import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Order, OrderItem, Product, User } from '@prisma/client';

type OrderWithDetails = Order & {
  orderItems: (OrderItem & { product: Product })[];
  user: User;
};

// Design tokens — same palette and fonts as the Prism landing page
const color = {
  page: '#f8f8f9',
  card: '#ffffff',
  ink: '#0a0a0a',
  body: '#52525b',
  muted: '#71717a',
  line: '#e4e4e7',
  soft: '#fafafa',
  sky: '#38bdf8',
  pink: '#f472b6',
  amber: '#f59e0b',
};
const font = {
  heading: `'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif`,
  body: `'Inter','Helvetica Neue',Helvetica,Arial,sans-serif`,
  mono: `'SFMono-Regular',Menlo,Consolas,monospace`,
};

// Where the "View order" style buttons point (relative to FRONTEND_URL)
const ORDERS_PATH = '/account/orders';

// Order data and user names end up inside HTML, so always escape them
const esc = (value: unknown): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (value: unknown): string => `$${Number(value).toFixed(2)}`;

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly fromAddress = 'Prism Store <noreply@prism.emersonic.dev>';
  // e.g. https://prism.emersonic.dev — used for the logo and the buttons
  private readonly frontendUrl?: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.frontendUrl = this.config
      .get<string>('FRONTEND_URL')
      ?.replace(/\/+$/, '');
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
      `Your order #${order.orderNumber} is on its way!`,
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

  async sendOrderRefundedEmail(order: OrderWithDetails) {
    await this.send(
      order.user.email,
      `Your order #${order.orderNumber} has been refunded`,
      this.orderRefundedTemplate(order),
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

  // ───────────────────────── Building blocks ─────────────────────────

  private paragraph(html: string): string {
    return `<p style="margin:0 0 16px 0;font-family:${font.body};font-size:15px;line-height:1.6;color:${color.body};">${html}</p>`;
  }

  private strong(value: unknown): string {
    return `<strong style="color:${color.ink};font-weight:600;">${esc(value)}</strong>`;
  }

  private greeting(order: OrderWithDetails): string {
    return order.user.name ? `Hi ${esc(order.user.name)},` : 'Hi there,';
  }

  // Primary button: solid black, like "Shop the catalog" on the landing.
  // Hidden when FRONTEND_URL is not configured, so we never send a broken link.
  private button(label: string, path = ORDERS_PATH): string {
    if (!this.frontendUrl) return '';
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">
        <tr>
          <td style="background:${color.ink};border-radius:8px;">
            <a href="${this.frontendUrl}${path}" style="display:inline-block;padding:14px 22px;font-family:${font.body};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${label}&nbsp;&rarr;</a>
          </td>
        </tr>
      </table>`;
  }

  // Received → Shipped → Delivered. It's a real sequence, so a stepper is honest here.
  private progress(step: 1 | 2 | 3): string {
    const labels = ['Received', 'Shipped', 'Delivered'];
    const cells = labels
      .map((label, i) => {
        const done = i < step;
        return `
          <td width="33%" style="padding-right:${i < 2 ? 6 : 0}px;">
            <div style="height:4px;border-radius:4px;background:${done ? color.ink : color.line};font-size:0;line-height:0;">&nbsp;</div>
            <p style="margin:8px 0 0 0;font-family:${font.body};font-size:12px;color:${done ? color.ink : color.muted};font-weight:${done ? 600 : 400};">${label}</p>
          </td>`;
      })
      .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;"><tr>${cells}</tr></table>`;
  }

  private infoBox(label: string, value: string): string {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;background:${color.soft};border:1px solid ${color.line};border-radius:12px;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 4px 0;font-family:${font.body};font-size:12px;color:${color.muted};">${label}</p>
            <p style="margin:0;font-family:${font.mono};font-size:15px;font-weight:600;color:${color.ink};letter-spacing:0.02em;">${esc(value)}</p>
          </td>
        </tr>
      </table>`;
  }

  private itemsRows(order: OrderWithDetails): string {
    return order.orderItems
      .map(
        (item) => `
        <tr>
          <td style="padding:6px 0;font-family:${font.body};font-size:14px;color:${color.ink};">${esc(item.product.name)} × ${esc(item.quantity)}</td>
          <td style="padding:6px 0;font-family:${font.body};font-size:14px;color:${color.ink};text-align:right;">${money(Number(item.price) * item.quantity)}</td>
        </tr>`,
      )
      .join('');
  }

  private orderSummary(order: OrderWithDetails): string {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;background:${color.soft};border:1px solid ${color.line};border-radius:12px;">
        <tr>
          <td style="padding:16px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td colspan="2" style="padding-bottom:8px;font-family:${font.body};font-size:12px;color:${color.muted};">Order #${esc(order.orderNumber)}</td>
              </tr>
              ${this.itemsRows(order)}
              <tr>
                <td style="padding-top:12px;border-top:1px solid ${color.line};font-family:${font.body};font-size:14px;font-weight:600;color:${color.ink};">Total</td>
                <td style="padding-top:12px;border-top:1px solid ${color.line};font-family:${font.body};font-size:14px;font-weight:600;color:${color.ink};text-align:right;">${money(order.total)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
  }

  // ───────────────────────── Layout ─────────────────────────

  private layout(opts: {
    preheader: string;
    title: string;
    body: string;
  }): string {
    // PNG version of the logo (Gmail/Outlook don't render SVG).
    // Host it at <FRONTEND_URL>/email-logo.png — see public/ in the frontend repo.
    const logo = this.frontendUrl
      ? `<td style="padding-right:10px;vertical-align:middle;"><img src="${this.frontendUrl}/email-logo.png" width="32" height="32" alt="" style="display:block;border:0;border-radius:8px;" /></td>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${esc(opts.title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background:${color.page};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(opts.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color.page};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

            <!-- Brand -->
            <tr>
              <td style="padding:0 4px 20px 4px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    ${logo}
                    <td style="vertical-align:middle;font-family:${font.heading};font-size:20px;font-weight:600;color:${color.ink};letter-spacing:-0.01em;">Prism</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td style="background:${color.card};border:1px solid ${color.line};border-radius:16px;overflow:hidden;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="50%" height="3" style="height:3px;line-height:3px;font-size:0;background:${color.sky};">&nbsp;</td>
                    <td width="30%" height="3" style="height:3px;line-height:3px;font-size:0;background:${color.pink};">&nbsp;</td>
                    <td width="20%" height="3" style="height:3px;line-height:3px;font-size:0;background:${color.amber};">&nbsp;</td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:36px 32px 40px 32px;">
                      <h1 style="margin:0 0 16px 0;font-family:${font.heading};font-size:30px;line-height:1.15;font-weight:700;letter-spacing:-0.03em;color:${color.ink};">${opts.title}</h1>
                      ${opts.body}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 4px 0 4px;">
                <p style="margin:0 0 8px 0;font-family:${font.body};font-size:12px;line-height:1.6;color:${color.muted};">Free shipping over $75 &nbsp;•&nbsp; 30-day returns &nbsp;•&nbsp; 2-year warranty</p>
                <p style="margin:0;font-family:${font.body};font-size:12px;line-height:1.6;color:${color.muted};">Prism Store — this email was generated automatically, please do not reply to this message.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  // ───────────────────────── Templates ─────────────────────────

  private orderReceivedTemplate(order: OrderWithDetails): string {
    return this.layout({
      preheader: `Order #${order.orderNumber} confirmed. We'll let you know when it ships.`,
      title: 'We received your order.',
      body: `
        ${this.paragraph(`${this.greeting(order)} thanks for shopping with Prism. We confirm your order ${this.strong(`#${order.orderNumber}`)} and will let you know as soon as it ships to your address.`)}
        ${this.progress(1)}
        ${this.orderSummary(order)}
        ${this.button('View order')}`,
    });
  }

  private orderShippedTemplate(order: OrderWithDetails): string {
    return this.layout({
      preheader: `Order #${order.orderNumber} has shipped.`,
      title: 'Your order is on its way.',
      body: `
        ${this.paragraph(`Your order ${this.strong(`#${order.orderNumber}`)} has been shipped. Once it arrives, please confirm the delivery from your account to complete the order.`)}
        ${this.progress(2)}
        ${order.trackingNumber ? this.infoBox('Tracking number', order.trackingNumber) : ''}
        ${this.button('Confirm delivery')}`,
    });
  }

  private orderDeliveredTemplate(order: OrderWithDetails): string {
    return this.layout({
      preheader: `Order #${order.orderNumber} was delivered. Thank you for your purchase.`,
      title: 'Your order was delivered.',
      body: `
        ${this.paragraph(`We confirm the delivery of your order ${this.strong(`#${order.orderNumber}`)}. Thank you for your purchase at Prism Store — we hope you enjoy it.`)}
        ${this.progress(3)}
        ${this.button('Continue shopping', '')}`,
    });
  }

  private orderRefundedTemplate(order: OrderWithDetails): string {
    return this.layout({
      preheader: `Order #${order.orderNumber} has been refunded.`,
      title: 'Your order was refunded.',
      body: `
        ${this.paragraph(`We confirm the refund of your order ${this.strong(`#${order.orderNumber}`)}. The amount will be credited back to your original payment method.`)}
        ${this.orderSummary(order)}
        ${this.button('View order')}`,
    });
  }
}
