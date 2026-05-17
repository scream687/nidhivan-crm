import { Test, TestingModule } from '@nestjs/testing';
import { SiteVisitsController } from './site-visits.controller';

describe('SiteVisitsController', () => {
  let controller: SiteVisitsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteVisitsController],
    }).compile();

    controller = module.get<SiteVisitsController>(SiteVisitsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
