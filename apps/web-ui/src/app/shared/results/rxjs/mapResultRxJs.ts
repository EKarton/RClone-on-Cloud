import { map, Observable, pipe, UnaryFunction } from 'rxjs';

import { Result } from '../results';
import { mapResult as rawMapResult } from '../utils/mapResult';

export function mapResultRxJs<T, U>(
  mapper: (value: T) => U,
): UnaryFunction<Observable<Result<T>>, Observable<Result<U>>> {
  return pipe(map((result: Result<T>) => rawMapResult(result, mapper)));
}
