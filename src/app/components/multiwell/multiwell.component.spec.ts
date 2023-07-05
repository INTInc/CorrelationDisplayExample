import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MultiWellComponent } from './multiwell.component';

describe('OverlayComponent', () => {
  let component: MultiWellComponent;
  let fixture: ComponentFixture<MultiWellComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MultiWellComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultiWellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
