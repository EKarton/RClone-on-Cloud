import { firstValueFrom, of, toArray } from 'rxjs';

import { Result, toFailure, toPending, toSuccess } from '../../results'; // adjust the import path as needed
import { mapResultRxJs } from '../mapResultRxJs'; // adjust the import path as needed

describe('mapResultRxJs', () => {
  const mapper = (value: number) => value * 2;

  it('should map successful results using the provided mapper', async () => {
    const source$ = of(toSuccess(1), toSuccess(2), toSuccess(3));

    const result = await firstValueFrom(source$.pipe(mapResultRxJs(mapper), toArray()));
    expect(result).toEqual([
      toSuccess(2), // 1 * 2
      toSuccess(4), // 2 * 2
      toSuccess(6), // 3 * 2
    ]);
  });

  it('should preserve loading state', async () => {
    const source$ = of(toPending<number>(), toSuccess(2));

    const result = await firstValueFrom(source$.pipe(mapResultRxJs(mapper), toArray()));
    expect(result).toEqual([
      toPending(), // Loading state should be preserved
      toSuccess(4), // 2 * 2
    ]);
  });

  it('should preserve error state', async () => {
    const error = new Error('Test error');
    const source$ = of(toFailure<number>(error), toSuccess(3));

    const result = await firstValueFrom(source$.pipe(mapResultRxJs(mapper), toArray()));
    expect(result).toEqual([
      toFailure<number>(error), // Error state should be preserved
      toSuccess(6), // 3 * 2
    ]);
  });

  it('should handle empty observables', async () => {
    const source$ = of<Result<number>>();

    const result = await firstValueFrom(source$.pipe(mapResultRxJs(mapper), toArray()), {
      defaultValue: [],
    });
    expect(result).toEqual([]); // Should emit nothing
  });
});
