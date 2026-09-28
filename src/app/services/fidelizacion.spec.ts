import { TestBed } from '@angular/core/testing';
import { Fidelizacion } from './fidelizacion';

describe('Fidelizacion', () => {
  let service: Fidelizacion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Fidelizacion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
