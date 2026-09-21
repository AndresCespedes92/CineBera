import { TestBed } from '@angular/core/testing';
import { Pelicula } from './pelicula';

describe('Pelicula', () => {
  let service: Pelicula;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Pelicula);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
