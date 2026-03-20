import { of } from 'rxjs';

import { Result, toFailure, toPending, toSuccess } from '../../results';
import { fromResult } from '../fromResult';

describe('fromResult', () => {
  it('should emit data from successful Result values', (done) => {
    const results: Result<number>[] = [
      toSuccess(1),
      toSuccess(2),
      toSuccess(3),
    ];
    const source$ = of(...results);

    const emitted: number[] = [];
    source$.pipe(fromResult()).subscribe({
      next: (value) => emitted.push(value),
      complete: () => {
        expect(emitted).toEqual([1, 2, 3]);
        done();
      },
      error: (err) => done.fail(err),
    });
  });

  it('should throw error from failed Result values', (done) => {
    const error = new Error('Test error');
    const results: Result<number>[] = [toFailure(error)];
    const source$ = of(...results);

    source$.pipe(fromResult()).subscribe({
      next: () => done.fail('Should not emit any value'),
      error: (err) => {
        expect(err).toBe(error);
        done();
      },
      complete: () => done.fail('Should not complete successfully'),
    });
  });

  it('should ignore pending Result values (no emission)', (done) => {
    const results: Result<number>[] = [toPending()];
    const source$ = of(...results);

    let emitted = false;
    source$.pipe(fromResult()).subscribe({
      next: () => {
        emitted = true;
      },
      complete: () => {
        expect(emitted).toBeFalse();
        done();
      },
      error: (err) => done.fail(err),
    });
  });

  it('should handle a mix of success, pending and failure results', (done) => {
    const error = new Error('Failure error');
    const results: Result<number>[] = [
      toSuccess(1),
      toPending(),
      toSuccess(2),
      toFailure(error),
      toSuccess(3), // should not emit after failure
    ];
    const source$ = of(...results);

    const emitted: number[] = [];
    source$.pipe(fromResult()).subscribe({
      next: (v) => emitted.push(v),
      error: (err) => {
        expect(emitted).toEqual([1, 2]);
        expect(err).toBe(error);
        done();
      },
      complete: () => done.fail('Should error out on failure'),
    });
  });

  it('should complete without emission on empty source', (done) => {
    const source$ = of<Result<number>>();

    let emitted = false;
    source$.pipe(fromResult()).subscribe({
      next: () => (emitted = true),
      complete: () => {
        expect(emitted).toBeFalse();
        done();
      },
      error: (err) => done.fail(err),
    });
  });
});
