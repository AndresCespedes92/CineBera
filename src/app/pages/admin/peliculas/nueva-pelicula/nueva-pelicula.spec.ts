import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevaPelicula } from './nueva-pelicula';

describe('NuevaPelicula', () => {
  let component: NuevaPelicula;
  let fixture: ComponentFixture<NuevaPelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaPelicula],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevaPelicula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
