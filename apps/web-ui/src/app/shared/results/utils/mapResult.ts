import {
  hasFailed,
  isPending,
  Result,
  toFailure,
  toPending,
  toSuccess,
} from '../results';

export function mapResult<T, U>(
  result: Result<T>,
  mapper: (value: T) => U,
): Result<U> {
  if (isPending(result)) {
    return toPending<U>();
  }

  if (hasFailed(result)) {
    return toFailure<U>(result.error!);
  }

  return toSuccess(mapper(result.data!));
}
