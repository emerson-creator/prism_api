import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_payments_service';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: {} },
        {
          provide: MailService,
          useValue: { sendOrderReceivedEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
