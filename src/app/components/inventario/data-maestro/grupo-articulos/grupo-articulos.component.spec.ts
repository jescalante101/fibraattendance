import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrupoArticulosComponent } from './grupo-articulos.component';

describe('GrupoArticulosComponent', () => {
  let component: GrupoArticulosComponent;
  let fixture: ComponentFixture<GrupoArticulosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GrupoArticulosComponent]
    });
    fixture = TestBed.createComponent(GrupoArticulosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
