import { map, Observable, pipe, UnaryFunction } from 'rxjs';

import { Result } from '../results';
import { mapResultt as rawMapResultt } from '../utils/mapResultt';

export function mapResultToResultRxJs<T, U>(
  mapper: (value: T) => Result<U>,
): UnaryFunction<Observable<Result<T>>, Observable<Result<U>>> {
  return pipe(map((result: Result<T>) => rawMapResultt(result, mapper)));
}
