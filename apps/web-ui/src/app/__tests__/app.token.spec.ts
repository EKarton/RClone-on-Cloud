import { TestBed } from '@angular/core/testing';

import {
  MAPBOX_FACTORY_TOKEN,
  NAVIGATOR,
  RESIZE_OBSERVER_FACTORY_TOKEN,
  WINDOW,
} from '../app.tokens';
import { MapboxFactory } from '../shared/mapbox-factory/MapboxFactory';
import { ResizeObserverFactory } from '../shared/resize-observer-factory/ResizeObserverFactory';

describe('InjectionTokens', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should provide the global window object', () => {
    const win = TestBed.inject(WINDOW);
    expect(win).toBe(window);
  });

  it('should provide the global navigator object', () => {
    const nav = TestBed.inject(NAVIGATOR);
    expect(nav).toBe(navigator);
  });

  it('should provide an instance of ResizeObserverFactory', () => {
    const factory = TestBed.inject(RESIZE_OBSERVER_FACTORY_TOKEN);
    expect(factory).toEqual(jasmine.any(ResizeObserverFactory));
  });

  it('should provide an instance of MapboxFactory', () => {
    const factory = TestBed.inject(MAPBOX_FACTORY_TOKEN);
    expect(factory).toEqual(jasmine.any(MapboxFactory));
  });
});
