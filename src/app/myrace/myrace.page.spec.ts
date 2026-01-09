import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyracePage } from './myrace.page';

describe('MyracePage', () => {
  let component: MyracePage;
  let fixture: ComponentFixture<MyracePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MyracePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
