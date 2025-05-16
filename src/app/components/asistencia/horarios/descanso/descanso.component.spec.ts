/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DescansoComponent } from './descanso.component';

describe('DescansoComponent', () => {
  let component: DescansoComponent;
  let fixture: ComponentFixture<DescansoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DescansoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DescansoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
