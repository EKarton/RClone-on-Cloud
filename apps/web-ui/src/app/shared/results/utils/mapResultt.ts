import { hasFailed, isPending, Result, toFailure, toPending } from '../results';

export function mapResultt<T, U>(
  result: Result<T>,
  mapper: (value: T) => Result<U>,
): Result<U> {
  if (isPending(result)) {
    return toPending<U>();
  }

  if (hasFailed(result)) {
    return toFailure<U>(result.error!);
  }

  return mapper(result.data!);
}
