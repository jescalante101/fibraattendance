/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { MarcacionesComponent } from './marcaciones.component';

describe('MarcacionesComponent', () => {
  let component: MarcacionesComponent;
  let fixture: ComponentFixture<MarcacionesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MarcacionesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MarcacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
