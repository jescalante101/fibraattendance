/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { Ac_dispositivoComponent } from './ac_dispositivo.component';

describe('Ac_dispositivoComponent', () => {
  let component: Ac_dispositivoComponent;
  let fixture: ComponentFixture<Ac_dispositivoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Ac_dispositivoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Ac_dispositivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
