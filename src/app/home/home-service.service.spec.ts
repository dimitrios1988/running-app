/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { HomeService } from './home.service';

describe('Service: HomeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HomeService],
    });
  });

  it('should ...', inject([HomeService], (service: HomeService) => {
    expect(service).toBeTruthy();
  }));
});
