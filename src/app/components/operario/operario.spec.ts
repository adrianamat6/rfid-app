import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Operario } from './operario';

describe('Operario', () => {
  let component: Operario;
  let fixture: ComponentFixture<Operario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Operario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Operario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
