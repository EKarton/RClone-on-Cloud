import { firstValueFrom, of, toArray } from 'rxjs';

import { Result, toFailure, toPending, toSuccess } from '../../results';
import { mapResultToResultRxJs } from '../mapResultToResultRxJs';

describe('mapResultToResultRxJs', () => {
  const successMapper = (value: number): Result<string> => toSuccess(value.toString());
  const failureMapper = (): Result<string> => toFailure(new Error('Mapper error'));

  it('should map successful results using the provided mapper', async () => {
    const source$ = of(toSuccess(1), toSuccess(2), toSuccess(3));

    const result = await firstValueFrom(
      source$.pipe(mapResultToResultRxJs(successMapper), toArray()),
    );
    expect(result).toEqual([
      toSuccess('1'), // 1 mapped to '1'
      toSuccess('2'), // 2 mapped to '2'
      toSuccess('3'), // 3 mapped to '3'
    ]);
  });

  it('should preserve loading state', async () => {
    const source$ = of(toPending<number>(), toSuccess(2));

    const result = await firstValueFrom(
      source$.pipe(mapResultToResultRxJs(successMapper), toArray()),
    );
    expect(result).toEqual([
      toPending(), // Loading state should be preserved
      toSuccess('2'), // 2 mapped to '2'
    ]);
  });

  it('should preserve error state', async () => {
    const error = new Error('Test error');
    const source$ = of(toFailure<number>(error), toSuccess(3));

    const result = await firstValueFrom(
      source$.pipe(mapResultToResultRxJs(successMapper), toArray()),
    );
    expect(result).toEqual([
      toFailure<string>(error), // Error state should be preserved
      toSuccess('3'), // 3 mapped to '3'
    ]);
  });

  it('should handle empty observables', async () => {
    const source$ = of();

    const result = await firstValueFrom(
      source$.pipe(mapResultToResultRxJs(successMapper), toArray()),
      { defaultValue: [] },
    );
    expect(result).toEqual([]); // Should emit nothing
  });

  it('should handle mapper returning failure', async () => {
    const source$ = of(toSuccess(1), toSuccess(2));

    const result = await firstValueFrom(
      source$.pipe(mapResultToResultRxJs(failureMapper), toArray()),
    );
    expect(result).toEqual([
      toFailure<string>(new Error('Mapper error')), // First success mapped to failure
      toFailure<string>(new Error('Mapper error')), // Second success also mapped to failure
    ]);
  });
});
