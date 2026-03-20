import { MapboxMarker } from '../MapboxFactory';

/** A mock of the {@code MapboxMarker<T>} */
export class MockMapboxMarker<T> extends MapboxMarker<T> {
  override setLngLat = jasmine.createSpy('setLngLat').and.returnValue(this);
  override addTo = jasmine.createSpy('addTo').and.returnValue(this);
  override remove = jasmine.createSpy('remove');
}
