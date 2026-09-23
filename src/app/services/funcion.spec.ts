import { TestBed } from '@angular/core/testing';
import { Funcion } from './funcion';

describe('Funcion', () => {
  let service: Funcion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Funcion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
