/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { InfoViewerService } from './info.viewer.service';

describe('Service: Info.viewer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InfoViewerService],
    });
  });

  it('should ...', inject([InfoViewerService], (service: InfoViewerService) => {
    expect(service).toBeTruthy();
  }));
});
