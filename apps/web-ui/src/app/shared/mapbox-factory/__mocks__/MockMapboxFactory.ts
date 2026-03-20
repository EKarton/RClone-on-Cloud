import { ComponentRef } from '@angular/core';

import { MockMapboxMap } from './MockMapboxMap';
import { MockMapboxMarker } from './MockMapboxMarker';

/** A factory class used to build an instance of Mapbox class. */
export class MockMapboxFactory<T> {
  private mapInstances: MockMapboxMap[] = [];
  private markerInstances: MockMapboxMarker<T>[] = [];

  getMapInstances(): MockMapboxMap[] {
    return [...this.mapInstances];
  }

  getMarkerInstances(): MockMapboxMarker<T>[] {
    return [...this.markerInstances];
  }

  getVisibleMarkerInstances(): MockMapboxMarker<T>[] {
    return this.markerInstances.filter(
      (marker) => marker.remove.calls.count() === 0,
    );
  }

  buildMap(): MockMapboxMap {
    const instance = new MockMapboxMap();
    this.mapInstances.push(instance);
    return instance;
  }

  buildMarker(componentInstance: ComponentRef<T>): MockMapboxMarker<T> {
    const instance = new MockMapboxMarker<T>(componentInstance);
    this.markerInstances.push(instance);
    return instance;
  }
}
