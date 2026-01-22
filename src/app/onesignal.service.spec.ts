import { TestBed } from '@angular/core/testing';

import { OneSignalService } from './onesignal.service';

describe('OneSignalService', () => {
  let service: OneSignalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OneSignalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
