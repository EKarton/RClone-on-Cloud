import { TestBed } from '@angular/core/testing';

import { WINDOW } from '../app.tokens';

describe('InjectionTokens', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should provide the global window object', () => {
    const win = TestBed.inject(WINDOW);
    expect(win).toBe(window);
  });
});
