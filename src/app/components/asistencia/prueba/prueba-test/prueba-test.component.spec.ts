/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { PruebaTestComponent } from './prueba-test.component';

describe('PruebaTestComponent', () => {
  let component: PruebaTestComponent;
  let fixture: ComponentFixture<PruebaTestComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PruebaTestComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PruebaTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
