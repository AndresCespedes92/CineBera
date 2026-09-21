import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FuncionesPelicula } from './funciones-pelicula';

describe('FuncionesPelicula', () => {
  let component: FuncionesPelicula;
  let fixture: ComponentFixture<FuncionesPelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FuncionesPelicula],
    }).compileComponents();

    fixture = TestBed.createComponent(FuncionesPelicula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
