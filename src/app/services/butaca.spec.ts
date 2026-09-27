import { TestBed } from '@angular/core/testing';
import { Butaca } from './butaca';

describe('Butaca', () => {
  let service: Butaca;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Butaca);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
