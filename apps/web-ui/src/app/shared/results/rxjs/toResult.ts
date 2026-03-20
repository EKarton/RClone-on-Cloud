import { catchError, map, Observable, of, pipe, UnaryFunction } from 'rxjs';

import { Result, toFailure, toSuccess } from '../results';

export function toResult<T>(): UnaryFunction<
  Observable<T>,
  Observable<Result<T>>
> {
  return pipe(
    map((t: T) => toSuccess(t)),
    catchError((error: Error) => of(toFailure<T>(error))),
  );
}
