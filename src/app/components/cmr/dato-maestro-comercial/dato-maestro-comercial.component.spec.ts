import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatoMaestroComercialComponent } from './dato-maestro-comercial.component';

describe('DatoMaestroComercialComponent', () => {
  let component: DatoMaestroComercialComponent;
  let fixture: ComponentFixture<DatoMaestroComercialComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DatoMaestroComercialComponent]
    });
    fixture = TestBed.createComponent(DatoMaestroComercialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
