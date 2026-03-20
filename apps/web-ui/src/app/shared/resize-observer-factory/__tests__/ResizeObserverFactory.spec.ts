import { ResizeObserverFactory } from '../ResizeObserverFactory';

describe('ResizeObserverFactory', () => {
  it('should return an instance of ResizeObserver when called build()', () => {
    const factory = new ResizeObserverFactory();
    const observer = factory.build(() => Object);

    expect(observer).toBeInstanceOf(ResizeObserver);
  });
});
