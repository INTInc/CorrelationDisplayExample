import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CorrelationComponent } from './correlation.component';

describe('OverlayComponent', () => {
  let component: CorrelationComponent;
  let fixture: ComponentFixture<CorrelationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CorrelationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CorrelationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
