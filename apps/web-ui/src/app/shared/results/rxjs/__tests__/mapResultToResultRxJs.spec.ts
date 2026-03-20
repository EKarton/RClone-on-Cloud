import { of } from 'rxjs';

import { Result, toFailure, toPending, toSuccess } from '../../results';
import { mapResultToResultRxJs } from '../mapResultToResultRxJs';

describe('mapResultToResultRxJs', () => {
  const successMapper = (value: number): Result<string> =>
    toSuccess(value.toString());
  const failureMapper = (): Result<string> =>
    toFailure(new Error('Mapper error'));

  it('should map successful results using the provided mapper', (done) => {
    const source$ = of(toSuccess(1), toSuccess(2), toSuccess(3));

    const result: Result<string>[] = [];
    source$.pipe(mapResultToResultRxJs(successMapper)).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([
          toSuccess('1'), // 1 mapped to '1'
          toSuccess('2'), // 2 mapped to '2'
          toSuccess('3'), // 3 mapped to '3'
        ]);
        done();
      },
    });
  });

  it('should preserve loading state', (done) => {
    const source$ = of(toPending<number>(), toSuccess(2));

    const result: Result<string>[] = [];
    source$.pipe(mapResultToResultRxJs(successMapper)).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([
          toPending(), // Loading state should be preserved
          toSuccess('2'), // 2 mapped to '2'
        ]);
        done();
      },
    });
  });

  it('should preserve error state', (done) => {
    const error = new Error('Test error');
    const source$ = of(toFailure<number>(error), toSuccess(3));

    const result: Result<string>[] = [];
    source$.pipe(mapResultToResultRxJs(successMapper)).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([
          toFailure<string>(error), // Error state should be preserved
          toSuccess('3'), // 3 mapped to '3'
        ]);
        done();
      },
    });
  });

  it('should handle empty observables', (done) => {
    const source$ = of();

    const result: Result<string>[] = [];
    source$.pipe(mapResultToResultRxJs(successMapper)).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([]); // Should emit nothing
        done();
      },
    });
  });

  it('should handle mapper returning failure', (done) => {
    const source$ = of(toSuccess(1), toSuccess(2));

    const result: Result<string>[] = [];
    source$.pipe(mapResultToResultRxJs(failureMapper)).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([
          toFailure<string>(new Error('Mapper error')), // First success mapped to failure
          toFailure<string>(new Error('Mapper error')), // Second success also mapped to failure
        ]);
        done();
      },
    });
  });
});
