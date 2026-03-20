/** A factory class used to build an instance of the ResizeObserver class. */
export class ResizeObserverFactory {
  build(callback: ResizeObserverCallback): ResizeObserver {
    return new ResizeObserver(callback);
  }
}
