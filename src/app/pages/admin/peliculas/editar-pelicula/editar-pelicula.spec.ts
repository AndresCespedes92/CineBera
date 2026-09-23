import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditarPelicula } from './editar-pelicula';

describe('EditarPelicula', () => {
  let component: EditarPelicula;
  let fixture: ComponentFixture<EditarPelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarPelicula],
    }).compileComponents();

    fixture = TestBed.createComponent(EditarPelicula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
