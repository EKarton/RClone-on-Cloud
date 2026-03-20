import { Result, toFailure, toPending } from '../results';

export function combineResults2<T, U, V>(
  result1: Result<T>,
  result2: Result<U>,
  mapper: (value1: T, value2: U) => V,
): Result<V> {
  if (result1.isLoading || result2.isLoading) {
    return toPending<V>();
  }

  if (result1.error || result2.error) {
    return toFailure<V>(result1.error ? result1.error : result2.error!);
  }

  return {
    data: mapper(result1.data!, result2.data!),
    isLoading: false,
    error: undefined,
  };
}
