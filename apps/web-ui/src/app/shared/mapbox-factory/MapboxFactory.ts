import { ComponentRef } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';

/** A wrapper on the {@code mapboxgl.Marker} so that we can capture its component instance */
export class MapboxMarker<T> extends mapboxgl.Marker {
  private componentInstance: ComponentRef<T>;

  constructor(componentInstance: ComponentRef<T>) {
    super(componentInstance.location.nativeElement);
    this.componentInstance = componentInstance;
  }

  getComponentInstance(): ComponentRef<T> {
    return this.componentInstance;
  }
}

/** A factory class used to build an instance of Mapbox class. */
export class MapboxFactory {
  buildMap(options: mapboxgl.MapOptions): mapboxgl.Map {
    return new mapboxgl.Map(options);
  }

  buildMarker<T>(componentInstance: ComponentRef<T>): MapboxMarker<T> {
    const marker = new MapboxMarker<T>(componentInstance);
    return marker;
  }
}
