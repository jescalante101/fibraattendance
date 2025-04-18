import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TablaNivelComponent } from './tabla-nivel.component';

describe('TablaNivelComponent', () => {
  let component: TablaNivelComponent;
  let fixture: ComponentFixture<TablaNivelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TablaNivelComponent]
    });
    fixture = TestBed.createComponent(TablaNivelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
