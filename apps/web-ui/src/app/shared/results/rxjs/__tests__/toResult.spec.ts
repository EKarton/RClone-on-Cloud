import { firstValueFrom, map, of, throwError, toArray } from 'rxjs';

import { toFailure, toPending, toSuccess } from '../../results';
import { toResult } from '../toResult';

describe('toResult', () => {
  it('should map successful values to Result', async () => {
    const source$ = of(1, 2, 3);

    const result = await firstValueFrom(source$.pipe(toResult(), toArray()));
    expect(result).toEqual([toPending(), toSuccess(1), toSuccess(2), toSuccess(3)]);
  });

  it('should handle errors and return a failure Result', async () => {
    const source$ = throwError(() => new Error('Test error'));

    const result = await firstValueFrom(source$.pipe(toResult(), toArray()));
    expect(result).toEqual([toPending(), toFailure<number>(new Error('Test error'))]);
  });

  it('should handle empty observables', async () => {
    const source$ = of<number>();

    const result = await firstValueFrom(source$.pipe(toResult(), toArray()));
    expect(result).toEqual([toPending()]);
  });

  it('should handle multiple errors in a stream', async () => {
    const source$ = of(1, 2, 3).pipe(
      map((value) => {
        if (value === 2) {
          throw new Error('Error on value 2');
        }
        return value;
      }),
    );

    const result = await firstValueFrom(source$.pipe(toResult(), toArray()));
    expect(result).toEqual([
      toPending(),
      toSuccess(1),
      toFailure<number>(new Error('Error on value 2')),
    ]);
  });
});
