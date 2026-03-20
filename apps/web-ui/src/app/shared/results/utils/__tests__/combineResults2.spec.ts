import { toFailure, toPending, toSuccess } from '../../results'; // adjust the import path as needed
import { combineResults2 } from '../combineResults2'; // adjust the import path as needed

describe('combineResults2', () => {
  const mapper = (a: number, b: string) => `${a}-${b}`;

  it('should return a pending result if result1 is loading', () => {
    const result1 = toPending<number>();
    const result2 = toSuccess('test');

    const combined = combineResults2(result1, result2, mapper);
    expect(combined).toEqual(toPending<string>());
  });

  it('should return a pending result if result2 is loading', () => {
    const result1 = toSuccess(5);
    const result2 = toPending<string>();

    const combined = combineResults2(result1, result2, mapper);
    expect(combined).toEqual(toPending<string>());
  });

  it('should return a failure result if result1 has an error', () => {
    const error = new Error('Test error');
    const result1 = toFailure<number>(error);
    const result2 = toSuccess('test');

    const combined = combineResults2(result1, result2, mapper);
    expect(combined).toEqual(toFailure<string>(error));
  });

  it('should return a failure result if result2 has an error', () => {
    const error = new Error('Test error');
    const result1 = toSuccess(5);
    const result2 = toFailure<string>(error);

    const combined = combineResults2(result1, result2, mapper);
    expect(combined).toEqual(toFailure<string>(error));
  });

  it('should apply the mapper function to successful results', () => {
    const result1 = toSuccess(5);
    const result2 = toSuccess('test');

    const combined = combineResults2(result1, result2, mapper);
    expect(combined).toEqual(toSuccess('5-test'));
  });

  it('should prioritize loading state over error state', () => {
    const error = new Error('Test error');
    const result1 = toFailure<number>(error);
    const result2 = toPending<string>();

    const combined = combineResults2(result1, result2, mapper);
    expect(combined).toEqual(toPending<string>());
  });

  it('should handle complex mapper functions', () => {
    const complexMapper = (a: number, b: string) => ({
      num: a,
      str: b,
      combined: `${a}-${b}`,
    });
    const result1 = toSuccess(5);
    const result2 = toSuccess('test');

    const combined = combineResults2(result1, result2, complexMapper);
    expect(combined).toEqual(
      toSuccess({ num: 5, str: 'test', combined: '5-test' }),
    );
  });
});
