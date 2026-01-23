import { TestBed } from '@angular/core/testing';

import { Async } from './async';

describe('Async', () => {
  let service: Async;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Async);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
