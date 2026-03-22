import { firstValueFrom, of, toArray } from 'rxjs';

import { Result, toFailure, toPending, toSuccess } from '../../results';
import { fromResult } from '../fromResult';

describe('fromResult', () => {
  it('should emit data from successful Result values', async () => {
    const results: Result<number>[] = [toSuccess(1), toSuccess(2), toSuccess(3)];
    const source$ = of(...results);

    const emitted = await firstValueFrom(source$.pipe(fromResult(), toArray()));
    expect(emitted).toEqual([1, 2, 3]);
  });

  it('should throw error from failed Result values', async () => {
    const error = new Error('Test error');
    const results: Result<number>[] = [toFailure(error)];
    const source$ = of(...results);

    await expect(firstValueFrom(source$.pipe(fromResult()))).rejects.toThrow(error);
  });

  it('should ignore pending Result values (no emission)', async () => {
    const results: Result<number>[] = [toPending()];
    const source$ = of(...results);

    const emitted = await firstValueFrom(source$.pipe(fromResult(), toArray()), {
      defaultValue: [],
    });
    expect(emitted).toEqual([]);
  });

  it('should handle a mix of success, pending and failure results', async () => {
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
    const promise = new Promise<void>((resolve, reject) => {
      source$.pipe(fromResult()).subscribe({
        next: (val) => emitted.push(val as number),
        error: (err) => {
          expect(emitted).toEqual([1, 2]);
          expect(err).toBe(error);
          resolve();
        },
        complete: () => reject(new Error('Should have errored')),
      });
    });
    await promise;
  });

  it('should complete without emission on empty source', async () => {
    const source$ = of<Result<number>>();

    const emitted = await firstValueFrom(source$.pipe(fromResult(), toArray()), {
      defaultValue: [],
    });
    expect(emitted).toEqual([]);
  });
});
