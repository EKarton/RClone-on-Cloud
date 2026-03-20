import { InjectionToken } from '@angular/core';

import { MapboxFactory } from './shared/mapbox-factory/MapboxFactory';
import { ResizeObserverFactory } from './shared/resize-observer-factory/ResizeObserverFactory';

/** An injection token to provide the window object. */
export const WINDOW = new InjectionToken<Window>('WindowToken', {
  providedIn: 'root',
  factory: () => window,
});

export const NAVIGATOR = new InjectionToken<Navigator>('NavigatorToken', {
  providedIn: 'root',
  factory: () => navigator,
});

export const RESIZE_OBSERVER_FACTORY_TOKEN =
  new InjectionToken<ResizeObserverFactory>('ResizeObserverFactory', {
    providedIn: 'root',
    factory: () => new ResizeObserverFactory(),
  });

export const MAPBOX_FACTORY_TOKEN = new InjectionToken<MapboxFactory>(
  'MapboxFactory',
  { providedIn: 'root', factory: () => new MapboxFactory() },
);
