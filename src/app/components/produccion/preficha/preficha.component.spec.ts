import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrefichaComponent } from './preficha.component';

describe('PrefichaComponent', () => {
  let component: PrefichaComponent;
  let fixture: ComponentFixture<PrefichaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PrefichaComponent]
    });
    fixture = TestBed.createComponent(PrefichaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
