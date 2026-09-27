import { TestBed } from '@angular/core/testing';
import { Entrada } from './entrada';

describe('Entrada', () => {
  let service: Entrada;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Entrada);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
