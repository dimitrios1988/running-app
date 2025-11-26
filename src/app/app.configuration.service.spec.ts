/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { AppConfigurationService } from './app.configuration.service';

describe('Service: App.service', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppConfigurationService],
    });
  });

  it('should ...', inject(
    [AppConfigurationService],
    (service: AppConfigurationService) => {
      expect(service).toBeTruthy();
    }
  ));
});
