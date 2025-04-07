import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermisosUsuarioComponent } from './permisos-usuario.component';

describe('PermisosUsuarioComponent', () => {
  let component: PermisosUsuarioComponent;
  let fixture: ComponentFixture<PermisosUsuarioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PermisosUsuarioComponent]
    });
    fixture = TestBed.createComponent(PermisosUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
