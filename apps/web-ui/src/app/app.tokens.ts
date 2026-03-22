import { InjectionToken } from '@angular/core';

/** An injection token to provide the window object. */
export const WINDOW = new InjectionToken<Window>('WindowToken', {
  providedIn: 'root',
  factory: () => window,
});
