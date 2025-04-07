import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LecturaCodebarComponent } from './lectura-codebar.component';

describe('LecturaCodebarComponent', () => {
  let component: LecturaCodebarComponent;
  let fixture: ComponentFixture<LecturaCodebarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LecturaCodebarComponent]
    });
    fixture = TestBed.createComponent(LecturaCodebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
