import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroReqComprasComponent } from './registro-req-compras.component';

describe('RegistroReqComprasComponent', () => {
  let component: RegistroReqComprasComponent;
  let fixture: ComponentFixture<RegistroReqComprasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RegistroReqComprasComponent]
    });
    fixture = TestBed.createComponent(RegistroReqComprasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
