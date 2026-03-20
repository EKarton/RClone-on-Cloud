import { of } from 'rxjs';

import { Result, toFailure, toPending, toSuccess } from '../../results';
import { switchMapResultToResultRxJs } from '../switchMapResultToResultRxJs';

describe('switchMapResultToResultRxJs', () => {
  const successMapper = (value: number) => of(toSuccess(value * 2));
  const failureMapper = () => of(toFailure<number>(new Error('Mapper error')));

  it('should switch to the mapped observable for successful results', (done) => {
    const source$ = of(toSuccess(1), toSuccess(2), toSuccess(3));

    const result: Result<number>[] = [];
    source$.pipe(switchMapResultToResultRxJs(successMapper)).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([
          toSuccess(2), // 1 * 2
          toSuccess(4), // 2 * 2
          toSuccess(6), // 3 * 2
        ]);
        done();
      },
    });
  });

  it('should preserve loading state', (done) => {
    const source$ = of(toPending<number>(), toSuccess(2));

    const result: Result<number>[] = [];
    source$.pipe(switchMapResultToResultRxJs(successMapper)).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([
          toPending(), // Loading state should be preserved
          toSuccess(4), // 2 * 2
        ]);
        done();
      },
    });
  });

  it('should preserve error state', (done) => {
    const error = new Error('Test error');
    const source$ = of(toFailure<number>(error), toSuccess(3));

    const result: Result<number>[] = [];
    source$.pipe(switchMapResultToResultRxJs(successMapper)).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([
          toFailure<number>(error), // Error state should be preserved
          toSuccess(6), // 3 * 2
        ]);
        done();
      },
    });
  });

  it('should handle empty observables', (done) => {
    const source$ = of();

    const result: Result<number>[] = [];
    source$.pipe(switchMapResultToResultRxJs(successMapper)).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([]); // Should emit nothing
        done();
      },
    });
  });

  it('should handle mapper returning failure', (done) => {
    const source$ = of(toSuccess<number>(1), toSuccess<number>(2));

    const result: Result<number>[] = [];
    source$.pipe(switchMapResultToResultRxJs(failureMapper)).subscribe({
      next: (value: Result<number>) => result.push(value),
      complete: () => {
        expect(result).toEqual([
          toFailure<number>(new Error('Mapper error')), // First success mapped to failure
          toFailure<number>(new Error('Mapper error')), // Second success also mapped to failure
        ]);
        done();
      },
    });
  });
});
