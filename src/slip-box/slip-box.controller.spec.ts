import { Test, TestingModule } from '@nestjs/testing';
import { SlipBoxController } from './slip-box.controller';

describe('SlipBoxController', () => {
  let controller: SlipBoxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlipBoxController],
    }).compile();

    controller = module.get<SlipBoxController>(SlipBoxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
