import { TestBed } from '@angular/core/testing';

import { MyRaceService } from './myrace.service';

describe('MyRaceService', () => {
  let service: MyRaceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyRaceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
