import mapboxgl from 'mapbox-gl';

/** A mock of the {@code mapboxgl.Map} */
export class MockMapboxMap {
  private onToLambda = new Map<string, () => void>();
  private onceToLambda = new Map<string, () => void>();

  private sourceIdToSource = new Map<string, mapboxgl.SourceSpecification>();
  private layerIdToLayer = new Map<string, mapboxgl.AnyLayer>();

  private zoom = 10;
  private bounds: mapboxgl.LngLatBounds | undefined = undefined;

  on = jasmine
    .createSpy('on')
    .and.callFake((event: string, lambda: () => void) => {
      this.onToLambda.set(event, lambda);
    });

  once = jasmine
    .createSpy('once')
    .and.callFake((event: string, lambda: () => void) => {
      this.onceToLambda.set(event, lambda);
    });

  setStyle = jasmine.createSpy('setStyle');
  setCenter = jasmine.createSpy('setCenter');
  easeTo = jasmine.createSpy('easeTo');
  remove = jasmine.createSpy('remove');
  getZoom = jasmine.createSpy('getZoom').and.callFake(() => this.zoom);
  getMaxZoom = jasmine.createSpy('getMaxZoom').and.returnValue(22);

  getSource = jasmine.createSpy('getSource').and.callFake((sourceId) => {
    if (this.sourceIdToSource.has(sourceId)) {
      return jasmine.createSpyObj<mapboxgl.GeoJSONSource>('GeoJSONSource', [
        'setData',
        'getClusterExpansionZoom',
        'getClusterChildren',
        'getClusterLeaves',
      ]);
    }
    return undefined;
  });

  addSource = jasmine
    .createSpy('addSource')
    .and.callFake((sourceId: string, specs: mapboxgl.SourceSpecification) =>
      this.sourceIdToSource.set(sourceId, specs),
    );

  getLayer = jasmine
    .createSpy('getLayer')
    .and.callFake((layerId: string) => this.layerIdToLayer.get(layerId));

  addLayer = jasmine
    .createSpy('addLayer')
    .and.callFake((specs: mapboxgl.AnyLayer) =>
      this.layerIdToLayer.set(specs.id, specs),
    );

  setLayoutProperty = jasmine.createSpy('setLayoutProperty');

  getBounds = jasmine.createSpy('getBounds').and.callFake(() => this.bounds);

  setBounds(north: number, east: number, south: number, west: number) {
    this.bounds = new mapboxgl.LngLatBounds(
      [west, south], // Southwest corner
      [east, north], // Northeast corner
    );
  }

  triggerOnEvent(event: string) {
    this.onToLambda.get(event)!();
  }

  triggerOnceEvents(event: string) {
    this.onceToLambda.get(event)!();
    this.onceToLambda.delete(event);
  }
}
