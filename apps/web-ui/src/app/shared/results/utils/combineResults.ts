import { Result, toFailure, toPending } from '../results';

export function combineResults<T, U>(
  results: Result<T>[],
  mapper: (value: T[]) => U,
): Result<U> {
  const someError = results.find((result) => result.error)?.error;
  if (someError) {
    return toFailure<U>(someError);
  }

  const someIsLoading = results.some((result) => result.isLoading);
  if (someIsLoading) {
    return toPending<U>();
  }

  return {
    data: mapper(results.map((result) => result.data!)),
    isLoading: false,
    error: undefined,
  };
}
