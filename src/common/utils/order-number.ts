import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';

const ORDER_NUMBER_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export async function generateOrderNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  for (;;) {
    const suffix = Array.from({ length: 8 }, () =>
      ORDER_NUMBER_ALPHABET.charAt(randomInt(ORDER_NUMBER_ALPHABET.length)),
    ).join('');
    const orderNumber = `ORD-${suffix}`;
    const existingOrder = await tx.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });

    if (!existingOrder) {
      return orderNumber;
    }
  }
}
