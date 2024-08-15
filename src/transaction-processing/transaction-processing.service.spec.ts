import { Test, TestingModule } from '@nestjs/testing';
import { TransactionProcessingService } from './transaction-processing.service';

describe('TransactionProcessingService', () => {
  let service: TransactionProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionProcessingService],
    }).compile();

    service = module.get<TransactionProcessingService>(TransactionProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
