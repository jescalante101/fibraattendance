import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataMaestroComponent } from './data-maestro.component';

describe('DataMaestroComponent', () => {
  let component: DataMaestroComponent;
  let fixture: ComponentFixture<DataMaestroComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DataMaestroComponent]
    });
    fixture = TestBed.createComponent(DataMaestroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
