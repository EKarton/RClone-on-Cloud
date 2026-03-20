import { ResizeObserverFactory } from '../ResizeObserverFactory';

/** A mock of the ResizeObserver */
export class MockResizeObserver extends ResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    super(callback);
    this.callback = callback;
  }

  trigger(entries: ResizeObserverEntry[]) {
    this.callback(entries, this);
  }
}

/** A mock of the ResizeObserverFactory */
export class MockResizeObserverFactory extends ResizeObserverFactory {
  private instances: MockResizeObserver[] = [];

  override build(callback: ResizeObserverCallback): ResizeObserver {
    const instance = new MockResizeObserver(callback);
    this.instances.push(instance);
    return instance;
  }

  getInstances(): MockResizeObserver[] {
    return [...this.instances];
  }
}
