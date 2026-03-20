import { filter, map, Observable, pipe, UnaryFunction } from 'rxjs';

import { hasSucceed, Result } from '../results';

export function filterOnlySuccess<T>(): UnaryFunction<
  Observable<Result<T>>,
  Observable<T>
> {
  return pipe(
    filter((t: Result<T>) => hasSucceed(t)),
    map((t: Result<T>) => t.data!),
  );
}
