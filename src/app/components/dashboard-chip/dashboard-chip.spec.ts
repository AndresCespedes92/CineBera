import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardChip } from './dashboard-chip';

describe('DashboardChip', () => {
  let component: DashboardChip;
  let fixture: ComponentFixture<DashboardChip>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardChip],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardChip);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
