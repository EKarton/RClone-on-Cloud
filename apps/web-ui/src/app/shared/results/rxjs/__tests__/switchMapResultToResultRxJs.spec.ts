import { firstValueFrom, of, toArray } from 'rxjs';

import { toFailure, toPending, toSuccess } from '../../results';
import { switchMapResultToResultRxJs } from '../switchMapResultToResultRxJs';

describe('switchMapResultToResultRxJs', () => {
  const successMapper = (value: number) => of(toSuccess(value * 2));
  const failureMapper = () => of(toFailure<number>(new Error('Mapper error')));

  it('should switch to the mapped observable for successful results', async () => {
    const source$ = of(toSuccess(1), toSuccess(2), toSuccess(3));

    const result = await firstValueFrom(
      source$.pipe(switchMapResultToResultRxJs(successMapper), toArray()),
    );
    expect(result).toEqual([
      toSuccess(2), // 1 * 2
      toSuccess(4), // 2 * 2
      toSuccess(6), // 3 * 2
    ]);
  });

  it('should preserve loading state', async () => {
    const source$ = of(toPending<number>(), toSuccess(2));

    const result = await firstValueFrom(
      source$.pipe(switchMapResultToResultRxJs(successMapper), toArray()),
    );
    expect(result).toEqual([
      toPending(), // Loading state should be preserved
      toSuccess(4), // 2 * 2
    ]);
  });

  it('should preserve error state', async () => {
    const error = new Error('Test error');
    const source$ = of(toFailure<number>(error), toSuccess(3));

    const result = await firstValueFrom(
      source$.pipe(switchMapResultToResultRxJs(successMapper), toArray()),
    );
    expect(result).toEqual([
      toFailure<number>(error), // Error state should be preserved
      toSuccess(6), // 3 * 2
    ]);
  });

  it('should handle empty observables', async () => {
    const source$ = of();

    const result = await firstValueFrom(
      source$.pipe(switchMapResultToResultRxJs(successMapper), toArray()),
      { defaultValue: [] },
    );
    expect(result).toEqual([]); // Should emit nothing
  });

  it('should handle mapper returning failure', async () => {
    const source$ = of(toSuccess<number>(1), toSuccess<number>(2));

    const result = await firstValueFrom(
      source$.pipe(switchMapResultToResultRxJs(failureMapper), toArray()),
    );
    expect(result).toEqual([
      toFailure<number>(new Error('Mapper error')), // First success mapped to failure
      toFailure<number>(new Error('Mapper error')), // Second success also mapped to failure
    ]);
  });
});
