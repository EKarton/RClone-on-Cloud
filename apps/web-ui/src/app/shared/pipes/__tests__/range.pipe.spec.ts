import { RangePipe } from '../range.pipe';

describe('RangePipe', () => {
  let pipe: RangePipe;

  beforeEach(() => {
    pipe = new RangePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should transform 0 into an empty array', () => {
    expect(pipe.transform(0)).toEqual([]);
  });

  it('should transform 1 into [1]', () => {
    expect(pipe.transform(1)).toEqual([1]);
  });

  it('should transform 5 into [1, 2, 3, 4, 5]', () => {
    expect(pipe.transform(5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle negative numbers as zero', () => {
    expect(pipe.transform(-3)).toEqual([]);
  });

  it('should handle floating point values by truncating', () => {
    expect(pipe.transform(3.7)).toEqual([1, 2, 3]);
  });
});
