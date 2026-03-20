import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as mapboxgl from 'mapbox-gl';

import { MapboxFactory, MapboxMarker } from '../MapboxFactory';

describe('MapboxFactory', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyComponent],
    }).compileComponents();
  });

  it('should return an instance of mapboxgl.Map when called buildMap()', () => {
    const mapMock = Object.create(mapboxgl.Map.prototype);
    spyOn(mapboxgl, 'Map').and.returnValue(mapMock);
    const fixture = TestBed.createComponent(EmptyComponent);

    const factory = new MapboxFactory();
    const map = factory.buildMap({
      container: fixture.nativeElement,
      accessToken: '1234',
      testMode: true,
    });

    expect(mapboxgl.Map).toHaveBeenCalledWith({
      container: fixture.nativeElement,
      accessToken: '1234',
      testMode: true,
    });
    expect(map).toBe(mapMock);
  });

  it('should return an instance of MapboxMarker when called buildMarker()', () => {
    const factory = new MapboxFactory();
    const fixture = TestBed.createComponent(EmptyComponent);

    const marker = factory.buildMarker(fixture.componentRef);

    expect(marker).toBeInstanceOf(MapboxMarker);
    expect(marker).toBeInstanceOf(mapboxgl.Marker);
    expect(marker.getComponentInstance()).toEqual(fixture.componentRef);
  });
});

@Component({
  selector: 'app-empty',
  template: '',
})
export class EmptyComponent {}
