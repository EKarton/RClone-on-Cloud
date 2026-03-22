import {
  catchError,
  map,
  Observable,
  of,
  pipe,
  startWith,
  UnaryFunction,
} from 'rxjs';

import { Result, toFailure, toPending, toSuccess } from '../results';

export function toResult<T>(): UnaryFunction<
  Observable<T>,
  Observable<Result<T>>
> {
  return pipe(
    map((t: T) => toSuccess(t)),
    catchError((error: Error) => of(toFailure<T>(error))),
    startWith(toPending<T>()),
  );
}
