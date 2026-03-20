import {
  EMPTY,
  mergeMap,
  Observable,
  pipe,
  throwError,
  UnaryFunction,
} from 'rxjs';

import { hasFailed, isPending, Result } from '../results';

export function fromResult<T>(): UnaryFunction<
  Observable<Result<T>>,
  Observable<T>
> {
  return pipe(
    mergeMap((result: Result<T>) => {
      if (hasFailed(result)) {
        return throwError(() => result.error);
      }
      if (isPending(result)) {
        return EMPTY;
      }
      return [result.data!];
    }),
  );
}
