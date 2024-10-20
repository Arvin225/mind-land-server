import { Test, TestingModule } from '@nestjs/testing';
import { SlipBoxService } from './slip-box.service';

describe('SlipBoxService', () => {
  let service: SlipBoxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlipBoxService],
    }).compile();

    service = module.get<SlipBoxService>(SlipBoxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
