import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OdontogramComponent } from './odontogram.component';

describe('OdontogramComponent', () => {
  let fixture: ComponentFixture<OdontogramComponent>;
  let component: OdontogramComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OdontogramComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(OdontogramComponent);
    component = fixture.componentInstance;
  });

  it('should not toggle selection in read-only mode', () => {
    fixture.componentRef.setInput('readOnly', true);
    component.selectedTeeth.set([11]);
    fixture.detectChanges();

    component.toggleTooth(12);

    expect(component.selectedTeeth()).toEqual([11]);
  });
});
