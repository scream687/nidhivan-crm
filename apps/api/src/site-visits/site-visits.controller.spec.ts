import { Test, TestingModule } from '@nestjs/testing';
import { SiteVisitsController } from './site-visits.controller';
import { SiteVisitsService } from './site-visits.service';
import { R2Service } from '../common/services/r2.service';

describe('SiteVisitsController', () => {
  let controller: SiteVisitsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteVisitsController],
      providers: [
        { provide: SiteVisitsService, useValue: {} },
        { provide: R2Service, useValue: {} },
      ],
    }).compile();

    controller = module.get<SiteVisitsController>(SiteVisitsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
