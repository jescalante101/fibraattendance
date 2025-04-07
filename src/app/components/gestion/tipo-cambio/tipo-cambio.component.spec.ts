import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoCambioComponent } from './tipo-cambio.component';

describe('TipoCambioComponent', () => {
  let component: TipoCambioComponent;
  let fixture: ComponentFixture<TipoCambioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TipoCambioComponent]
    });
    fixture = TestBed.createComponent(TipoCambioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
