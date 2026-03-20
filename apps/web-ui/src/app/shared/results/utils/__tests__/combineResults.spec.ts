import { Result, toFailure, toPending, toSuccess } from '../../results'; // adjust the import path as needed
import { combineResults } from '../combineResults'; // adjust the import path as needed

describe('combineResults', () => {
  const mapper = (values: number[]) => values.reduce((a, b) => a + b, 0);

  it('should return a pending result if any input result is loading', () => {
    const results: Result<number>[] = [
      toSuccess(1),
      toPending<number>(),
      toSuccess(3),
    ];

    const combined = combineResults(results, mapper);
    expect(combined).toEqual(toPending<number>());
  });

  it('should return a failure result if any input result has an error', () => {
    const error = new Error('Test error');
    const results: Result<number>[] = [
      toSuccess(1),
      toFailure<number>(error),
      toSuccess(3),
    ];

    const combined = combineResults(results, mapper);
    expect(combined).toEqual(toFailure<number>(error));
  });

  it('should apply the mapper function to successful results', () => {
    const results: Result<number>[] = [
      toSuccess(1),
      toSuccess(2),
      toSuccess(3),
    ];

    const combined = combineResults(results, mapper);
    expect(combined).toEqual(toSuccess(6));
  });

  it('should handle an empty array of results', () => {
    const results: Result<number>[] = [];

    const combined = combineResults(results, mapper);
    expect(combined).toEqual(toSuccess(0));
  });

  it('should prioritize error state over loading state', () => {
    const error = new Error('Test error');
    const results: Result<number>[] = [
      toSuccess(1),
      toFailure<number>(error),
      toPending<number>(),
    ];

    const combined = combineResults(results, mapper);
    expect(combined).toEqual(toFailure<number>(error));
  });

  it('should handle complex mapper functions', () => {
    const complexMapper = (values: number[]) => ({
      sum: values.reduce((a, b) => a + b, 0),
      count: values.length,
    });
    const results: Result<number>[] = [
      toSuccess(1),
      toSuccess(2),
      toSuccess(3),
    ];

    const combined = combineResults(results, complexMapper);
    expect(combined).toEqual(toSuccess({ sum: 6, count: 3 }));
  });
});
