import { map, of, throwError } from 'rxjs';

import { Result, toFailure, toSuccess } from '../../results';
import { toResult } from '../toResult';

describe('toResult', () => {
  it('should map successful values to Result', (done) => {
    const source$ = of(1, 2, 3);

    const result: Result<number>[] = [];
    source$.pipe(toResult()).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([toSuccess(1), toSuccess(2), toSuccess(3)]);
        done();
      },
    });
  });

  it('should handle errors and return a failure Result', (done) => {
    const source$ = throwError(() => new Error('Test error'));

    const result: Result<number>[] = [];
    source$.pipe(toResult()).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([toFailure<number>(new Error('Test error'))]);
        done();
      },
    });
  });

  it('should handle empty observables', (done) => {
    const source$ = of<number>();

    const result: Result<number>[] = [];
    source$.pipe(toResult()).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result).toEqual([]); // Should emit nothing
        done();
      },
    });
  });

  it('should handle multiple errors in a stream', (done) => {
    const source$ = of(1, 2, 3).pipe(
      map((value) => {
        if (value === 2) {
          throw new Error('Error on value 2');
        }
        return value;
      }),
    );

    const result: Result<number>[] = [];
    source$.pipe(toResult()).subscribe({
      next: (value) => result.push(value),
      complete: () => {
        expect(result.length).toEqual(2);
        expect(result).toEqual([
          toSuccess(1),
          toFailure<number>(new Error('Error on value 2')),
        ]);
        done();
      },
    });
  });
});
