/* tslint:disable:no-unused-variable */

import { TestBed, waitForAsync, inject } from '@angular/core/testing';
import { NewsService } from './news.service';

describe('Service: News', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NewsService],
    });
  });

  it('should ...', inject([NewsService], (service: NewsService) => {
    expect(service).toBeTruthy();
  }));
});
