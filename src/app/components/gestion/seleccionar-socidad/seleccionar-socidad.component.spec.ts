import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeleccionarSocidadComponent } from './seleccionar-socidad.component';

describe('SeleccionarSocidadComponent', () => {
  let component: SeleccionarSocidadComponent;
  let fixture: ComponentFixture<SeleccionarSocidadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SeleccionarSocidadComponent]
    });
    fixture = TestBed.createComponent(SeleccionarSocidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
