import { Observable, of, pipe, switchMap, UnaryFunction } from 'rxjs';

import { Result, toFailure, toPending } from '../results';

export function switchMapResultToResultRxJs<T, U>(
  mapper: (value: T) => Observable<Result<U>>,
): UnaryFunction<Observable<Result<T>>, Observable<Result<U>>> {
  return pipe(
    switchMap((result: Result<T>) => {
      if (result.isLoading) {
        return of(toPending<U>());
      }

      if (result.error) {
        return of(toFailure<U>(result.error));
      }

      return mapper(result.data!);
    }),
  );
}
