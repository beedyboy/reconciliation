import { Test, TestingModule } from '@nestjs/testing';
import { TransactionProcessingController } from './transaction-processing.controller';

describe('TransactionProcessingController', () => {
  let controller: TransactionProcessingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionProcessingController],
    }).compile();

    controller = module.get<TransactionProcessingController>(TransactionProcessingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
