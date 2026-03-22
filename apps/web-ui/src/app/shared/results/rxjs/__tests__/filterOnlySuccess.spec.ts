import { firstValueFrom, of, toArray } from 'rxjs';

import { Result, toFailure, toPending, toSuccess } from '../../results';
import { filterOnlySuccess } from '../filterOnlySuccess';

describe('filterOnlySuccess', () => {
  it('should emit only successful results', async () => {
    const source$ = of(
      toSuccess(1),
      toPending<number>(),
      toFailure<number>(new Error('Error')),
      toSuccess(2),
    );

    const result = await firstValueFrom(source$.pipe(filterOnlySuccess(), toArray()));
    expect(result).toEqual([1, 2]);
  });

  it('should emit nothing if there are no successful results', async () => {
    const source$ = of(toPending<number>(), toFailure<number>(new Error('Error')));

    const result = await firstValueFrom(source$.pipe(filterOnlySuccess(), toArray()), {
      defaultValue: [],
    });
    expect(result).toEqual([]);
  });

  it('should handle an empty observable', async () => {
    const source$ = of<Result<number>>();

    const result = await firstValueFrom(source$.pipe(filterOnlySuccess(), toArray()), {
      defaultValue: [],
    });
    expect(result).toEqual([]);
  });

  it('should work with complex data types', async () => {
    interface ComplexData {
      id: number;
      name: string;
    }
    const complexData: ComplexData = { id: 1, name: 'Test' };
    const source$ = of(toSuccess(complexData), toFailure<ComplexData>(new Error('Error')));

    const result = await firstValueFrom(source$.pipe(filterOnlySuccess(), toArray()));
    expect(result).toEqual([complexData]);
  });
});
