export interface Result<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

export function isPending<T>(result: Result<T>): boolean {
  return result.isLoading;
}

export function hasSucceed<T>(result: Result<T>): boolean {
  return result.error === undefined && !result.isLoading;
}

export function hasFailed<T>(result: Result<T>): boolean {
  return result.error !== undefined;
}

export function toPending<T>(): Result<T> {
  return {
    data: undefined,
    isLoading: true,
    error: undefined,
  };
}

export function toSuccess<T>(data: T): Result<T> {
  return {
    data,
    isLoading: false,
    error: undefined,
  };
}

export function toFailure<T>(error: Error): Result<T> {
  return {
    data: undefined,
    isLoading: false,
    error,
  };
}
